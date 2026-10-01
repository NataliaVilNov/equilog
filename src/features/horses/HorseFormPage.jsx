import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStableData } from "../../hooks/useStableData.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { useToast } from "../../hooks/useToast.js";
import { uid } from "../../lib/id.js";
import { canViewHorseInfo, isHorseRestricted } from "./horseAccess.js";
import { AccessLimited } from "../../components/AccessLimited.jsx";
import { OwnerSplitEditor } from "./OwnerSplitEditor.jsx";
import { PedigreeFields } from "./PedigreeFields.jsx";
import { HorseAccessEditor } from "./HorseAccessEditor.jsx";

const PEDIGREE_KEYS = ["sire", "dam", "gsire", "gdam", "mgsire", "mgdam"];

function ownersFromHorse(horse) {
  if (horse && horse.owners && horse.owners.length) return horse.owners.map((o) => ({ ...o }));
  if (horse && horse.owner) return [{ nombre: horse.owner, pct: 100 }];
  return [{ nombre: "", pct: 100 }];
}

function fieldsFromHorse(horse) {
  const base = {
    name: "",
    breed: "",
    aliases: "",
    origin: "",
    dob: "",
    arrival: "",
    notes: "",
    photo: null,
    horsetelex: "",
  };
  PEDIGREE_KEYS.forEach((k) => (base[k] = ""));
  if (!horse) return base;
  return {
    ...base,
    name: horse.name || "",
    breed: horse.breed || "",
    aliases: horse.aliases || horse.alias || "",
    origin: horse.origin || "",
    dob: horse.dob || "",
    arrival: horse.arrival || "",
    notes: horse.notes || "",
    photo: horse.photo || null,
    horsetelex: horse.horsetelex || "",
    sire: horse.sire || "",
    dam: horse.dam || "",
    gsire: horse.gsire || "",
    gdam: horse.gdam || "",
    mgsire: horse.mgsire || "",
    mgdam: horse.mgdam || "",
  };
}

// Ports rHF (public/legacy-app.js:1576-1643) and the horse-save handler in attach()
// (public/legacy-app.js:3622-3646). The route-level PermissionRoute("horses") replaces
// requirePermissionView.
export function HorseFormPage() {
  const { hid } = useParams();
  const editing = !!hid;
  const { horses, team, addHorse, updateHorse, deleteHorse, uploadHorsePhoto } = useStableData();
  const { can, isAdmin, uid: myUid } = usePermissions();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const horse = editing ? horses.find((h) => h.id === hid) : null;
  // Generated up front (not just at submit) so a photo picked before saving can upload
  // straight to its final Storage path under this horse's own id.
  const [id] = useState(() => (editing ? hid : uid()));
  const [fields, setFields] = useState(() => fieldsFromHorse(horse));
  const [owners, setOwners] = useState(() => ownersFromHorse(horse));
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [restricted, setRestricted] = useState(() => isHorseRestricted(horse));
  const [allowedUids, setAllowedUids] = useState(() =>
    isHorseRestricted(horse) ? horse.allowedUids : editing ? [] : myUid ? [myUid] : []
  );

  const pedigree = useMemo(() => {
    const p = {};
    PEDIGREE_KEYS.forEach((k) => (p[k] = fields[k]));
    return p;
  }, [fields]);

  if (editing && !horse) {
    return (
      <div className="view">
        <p>No encontrado.</p>
      </div>
    );
  }

  const authorized = !editing || canViewHorseInfo(horse, isAdmin, myUid);
  if (editing && horse && !authorized) {
    return <AccessLimited />;
  }

  function setField(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function handlePedigreeImport(updates) {
    setFields((prev) => ({ ...prev, ...updates }));
  }

  async function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const photo = await uploadHorsePhoto(id, file, () => {});
      setField("photo", photo);
    } catch (_err) {
      showToast("Error subiendo la foto");
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handleSubmit() {
    const name = fields.name.trim();
    if (!name) {
      showToast("Nombre obligatorio");
      return;
    }
    const ownersArr = owners
      .map((o) => ({ nombre: (o.nombre || "").trim(), pct: Number(o.pct) || 0 }))
      .filter((o) => o.nombre);
    const totalPct = ownersArr.reduce((s, o) => s + o.pct, 0);
    if (ownersArr.length && Math.abs(totalPct - 100) > 0.5) {
      showToast("Los porcentajes deben sumar 100%");
      return;
    }
    const record = {
      id,
      name,
      owner: ownersArr.length ? ownersArr[0].nombre : "",
      owners: ownersArr,
      breed: fields.breed.trim(),
      aliases: fields.aliases.trim(),
      origin: fields.origin.trim(),
      dob: fields.dob,
      arrival: fields.arrival,
      notes: fields.notes.trim(),
      sire: fields.sire.trim(),
      dam: fields.dam.trim(),
      gsire: fields.gsire.trim(),
      gdam: fields.gdam.trim(),
      mgsire: fields.mgsire.trim(),
      mgdam: fields.mgdam.trim(),
      horsetelex: fields.horsetelex.trim(),
      photo: fields.photo,
    };
    if (editing && horse && horse.sale) record.sale = horse.sale;
    record.allowedUids = isAdmin
      ? restricted
        ? allowedUids
        : null
      : editing && horse
      ? horse.allowedUids ?? null
      : [myUid];
    if (editing) updateHorse(record);
    else addHorse(record);
    showToast(editing ? "Guardado" : "Caballo añadido");
    navigate(`/horses/${id}?tab=entrenos`);
  }

  function handleDelete() {
    if (!window.confirm("¿Eliminar este caballo y todos sus datos?")) return;
    deleteHorse(hid);
    showToast("Caballo eliminado");
    navigate("/horses");
  }

  return (
    <div className="view">
      <div className="vh">
        <button className="ib" onClick={() => navigate(editing ? `/horses/${hid}?tab=entrenos` : "/horses")}>
          ←
        </button>
        <h1>{editing ? "Editar caballo" : "Nuevo caballo"}</h1>
      </div>
      <div className="f">
        <label>Foto</label>
        <div className="pu">
          <div className="pp">
            {uploadingPhoto ? "…" : fields.photo ? <img src={fields.photo.url} alt="" /> : "🐴"}
          </div>
          <label className="fl">
            Elegir foto
            <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploadingPhoto} />
          </label>
        </div>
      </div>
      <div className="f">
        <label>Nombre *</label>
        <input value={fields.name} onChange={(e) => setField("name", e.target.value)} placeholder="Ej: Tornado" />
      </div>
      <div className="f">
        <label>Raza</label>
        <input value={fields.breed} onChange={(e) => setField("breed", e.target.value)} placeholder="PRE" />
      </div>
      <div className="f">
        <label>Alias / motes</label>
        <input
          value={fields.aliases}
          onChange={(e) => setField("aliases", e.target.value)}
          placeholder="Ej: Chaco, Cales, Go Go"
        />
      </div>
      <OwnerSplitEditor owners={owners} onChange={setOwners} />
      <div className="f">
        <label>Origen / Procedencia</label>
        <input
          value={fields.origin}
          onChange={(e) => setField("origin", e.target.value)}
          placeholder="Ej: Yeguada Santa Cruz, Sevilla"
        />
      </div>
      <PedigreeFields
        pedigree={pedigree}
        onFieldChange={setField}
        horsetelex={fields.horsetelex}
        onHorsetelexChange={(v) => setField("horsetelex", v)}
        onImport={handlePedigreeImport}
        current={fields}
      />
      <div className="r2">
        <div className="f">
          <label>Nacimiento</label>
          <input type="date" value={fields.dob} onChange={(e) => setField("dob", e.target.value)} />
        </div>
        <div className="f">
          <label>Llegada</label>
          <input type="date" value={fields.arrival} onChange={(e) => setField("arrival", e.target.value)} />
        </div>
      </div>
      <div className="f">
        <label>Notas</label>
        <textarea value={fields.notes} onChange={(e) => setField("notes", e.target.value)} />
      </div>
      {isAdmin ? (
        <HorseAccessEditor
          team={team}
          restricted={restricted}
          onRestrictedChange={setRestricted}
          allowedUids={allowedUids}
          onAllowedUidsChange={setAllowedUids}
        />
      ) : (
        editing &&
        isHorseRestricted(horse) && (
          <div className="card" style={{ padding: ".85rem", marginBottom: ".85rem", fontSize: ".82rem" }}>
            🔒 Compartido con:{" "}
            {team
              .filter((m) => horse.allowedUids.includes(m.uid || m.userId || m.authUid))
              .map((m) => m.name)
              .join(", ") || "nadie más (solo administradores)"}
          </div>
        )
      )}
      <div style={{ display: "grid", gap: ".42rem" }}>
        <button type="button" className="btn bts btbl" onClick={handleSubmit}>
          {editing ? "Guardar cambios" : "Añadir caballo"}
        </button>
        {editing && can("deleteItems") && (
          <button type="button" className="btn btr btbl" onClick={handleDelete}>
            Eliminar caballo
          </button>
        )}
      </div>
    </div>
  );
}
