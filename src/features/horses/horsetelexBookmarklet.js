// A bookmarklet that runs on the user's own Horsetelex tab and copies the page's data to the
// clipboard, so importing is "click the bookmark, then Pegar in EquiLog" instead of Ctrl+U,
// select-all, copy. It never talks to EquiLog or to any server: it only reads what the page
// already has (Angular's <script id="serverApp-state"> transfer state, falling back to the
// whole document source) and puts it on the clipboard. If Horsetelex's CSP blocks bookmarklets
// the manual Ctrl+U route in HorsetelexImportButton keeps working.
const SOURCE = `(function(){
  try {
    var el = document.getElementById("serverApp-state");
    var data = el ? el.textContent : document.documentElement.outerHTML;
    navigator.clipboard.writeText(data).then(
      function(){ alert("EquiLog: datos del caballo copiados. Vuelve a EquiLog y pulsa Pegar."); },
      function(){ alert("EquiLog: no se pudo copiar. Usa Ctrl+U, Ctrl+A, Ctrl+C y pega en EquiLog."); }
    );
  } catch (e) { alert("EquiLog: " + e.message); }
})();`;

export const HORSETELEX_BOOKMARKLET = "javascript:" + encodeURIComponent(SOURCE.replace(/\s*\n\s*/g, ""));
