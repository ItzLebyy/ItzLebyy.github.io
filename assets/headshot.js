(() => {
    "use strict";
    const headSource = new URL("headshot-head.svg", document.currentScript.src).href;
    const key = "vojta.headshot.v1";
    const modes = { reaction: "REACTION TEST", aim: "AIM CHALLENGE" };
    const positive = value => typeof value === "number" && Number.isFinite(value) && value > 0 && value < 600000 ? value : null;
    const count = value => Number.isSafeInteger(value) && value >= 0 && value < 10000000 ? value : 0;
    let records = { bestReaction: null, bestAverage: null, bestAim: 0, recent: [] };
    try {
        const saved = JSON.parse(localStorage.getItem(key));
        if (saved && typeof saved === "object") {
            records.bestReaction = positive(saved.bestReaction);
            records.bestAverage = positive(saved.bestAverage);
            records.bestAim = count(saved.bestAim);
            if (Array.isArray(saved.recent)) records.recent = saved.recent.filter(result => result && Object.hasOwn(modes, result.mode) &&
                (result.average === 0 || positive(result.average)) && (result.best === 0 || positive(result.best)) && Number.isFinite(Date.parse(result.date)) &&
                count(result.hits) === result.hits && count(result.misses) === result.misses).slice(0, 10);
        }
    } catch { /* The trainer also works with blocked or damaged storage. */ }
    let dialog, arena, target, screen, live, previousFocus, scrollState, frame, observer, sessionEvents;
    let generation = 0;
    let state = { phase: "menu", mode: "reaction" };
    const timers = new Set();
    const $ = name => dialog.querySelector('[data-hs="' + name + '"]');
    const ms = value => value ? Math.round(value) + " MS" : "—";
    const average = times => times.length ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
    const accuracy = () => state.hits + state.misses ? Math.round(100 * state.hits / (state.hits + state.misses)) : 0;
    function later(callback, delay) {
        const current = generation;
        const id = window.setTimeout(() => {
            timers.delete(id);
            if (dialog.open && current === generation) callback();
        }, delay);
        timers.add(id);
    }
    function clearWork() {
        generation++;
        timers.forEach(id => window.clearTimeout(id)); timers.clear();
        window.cancelAnimationFrame(frame);
        target?.remove(); target = null;
        arena?.querySelectorAll(".hs-feedback").forEach(element => element.remove());
        arena?.classList.remove("hs-hit");
    }
    function announce(text) { live.textContent = text; }
    function stat(label, value) {
        const item = document.createElement("div");
        const name = document.createElement("span"); name.textContent = label;
        const number = document.createElement("strong"); number.textContent = value;
        item.append(name, number); return item;
    }
    function action(label, callback, secondary = false) {
        const button = document.createElement("button"); button.type = "button";
        button.className = "hs-button" + (secondary ? " hs-secondary" : "");
        button.textContent = label; button.addEventListener("click", callback); return button;
    }
    function showScreen(kicker, title, description) {
        screen.hidden = false; screen.replaceChildren();
        const copy = document.createElement("div"); copy.className = "hs-screen-copy";
        const eyebrow = document.createElement("p"); eyebrow.className = "hs-eyebrow"; eyebrow.textContent = kicker;
        const heading = document.createElement("h2"); heading.textContent = title;
        const text = document.createElement("p"); text.className = "hs-description"; text.textContent = description;
        copy.append(eyebrow, heading, text); screen.append(copy);
        const content = document.createElement("div"); content.className = "hs-screen-content"; screen.append(content);
        return content;
    }
    function focusScreen() { screen.querySelector("button")?.focus({ preventScroll: true }); }
    function updateHud(now = performance.now()) {
        $("mode").textContent = modes[state.mode];
        $("hits").textContent = state.hits || 0;
        $("misses").textContent = state.misses || 0;
        $("accuracy").textContent = state.hits || state.misses ? accuracy() + "%" : "—";
        $("average").textContent = ms(average(state.times || []));
        $("best").textContent = ms(state.times?.length ? Math.min(...state.times) : 0);
        const remaining = state.phase === "paused" ? state.remaining : Math.max(0, (state.deadline || 0) - now);
        $("timer").textContent = state.mode === "aim" ? "00:" + String(Math.ceil((state.started ? remaining : 30000) / 1000)).padStart(2, "0") : (state.hits || 0) + " / 10";
        $("progress").style.width = (state.mode === "aim" ? state.started ? Math.min(100, 100 * (30000 - remaining) / 30000) : 0 : (state.hits || 0) * 10) + "%";
    }
    function menu() {
        clearWork(); state = { phase: "menu", mode: "reaction", hits: 0, misses: 0, times: [] }; updateHud();
        $("hint").textContent = "TAJNÁ MÍSTNOST / TRÉNINK ZAČÍNÁ TADY";
        const content = showScreen("VOJTA.EXE / SECRET LEVEL 03", "HEADSHOT TRAINER", "Malý trénink. Přesná muška. Ještě jeden pokus? Vyber si režim a pojď na střelnici.");
        for (const mode of ["reaction", "aim"]) {
            const button = action(modes[mode] + "  ↗", () => briefing(mode));
            const description = document.createElement("span");
            description.textContent = mode === "reaction" ? "10 terčů · jak rychle zareaguješ?" : "30 sekund · kolik jich trefíš?";
            button.append(description); content.append(button);
        }
        const row = document.createElement("div"); row.className = "hs-actions";
        row.append(action("LOCAL RECORDS", showRecords, true), action("EXIT ↗", close, true)); content.append(row);
        announce("Tajný Headshot Trainer. Vyber režim."); focusScreen();
    }
    function briefing(mode) {
        clearWork(); state.mode = mode; state.phase = "brief"; updateHud();
        const content = showScreen("VYBER REŽIM / " + (mode === "reaction" ? "01" : "02"), modes[mode], mode === "reaction" ?
            "Po odpočtu čekej na hlavu. Tref ji co nejrychleji. Čekání je náhodné, trénink končí po 10 zásazích. Kliky před objevením terče se nepočítají." :
            "Máš 30 sekund. Každý zásah je bod a nový terč. Kliknutí vedle znamená chybu. Drž přesnost a zkus překonat svůj rekord.");
        const note = document.createElement("p"); note.className = "hs-description";
        note.textContent = "Myš nebo dotyk · klávesnicí zaměř terč pomocí Tab a potvrď Enter · Esc = odejít. Přepnutí záložky trénink pozastaví.";
        content.append(note, action("START TRAINING ↗", () => start(mode)), action("← HLAVNÍ MENU", menu, true)); focusScreen();
    }
    function start(mode) {
        clearWork(); state = { mode, phase: "countdown", hits: 0, misses: 0, times: [], remaining: 30000, started: false, position: null };
        countdown();
    }
    function countdown() {
        state.phase = "countdown"; screen.hidden = true; updateHud(); arena.focus({ preventScroll: true });
        $("hint").textContent = "PŘIPRAV SE / ZAMĚŘ / TREF";
        const number = document.createElement("div"); number.className = "hs-countdown hs-feedback"; arena.append(number);
        function tick(value) {
            number.textContent = value; announce("Start za " + value);
            if (value > 1) later(() => tick(value - 1), 1000);
            else later(() => {
                number.remove(); state.started = true; state.deadline = performance.now() + state.remaining;
                state.phase = "waiting"; nextTarget(); clock();
            }, 1000);
        }
        tick(3);
    }
    function clock() {
        if (!["active", "waiting"].includes(state.phase)) return;
        const now = performance.now();
        if (state.mode === "aim" && now >= state.deadline) { finish(); return; }
        if (!state.lastHud || now - state.lastHud > 80) { updateHud(now); state.lastHud = now; }
        frame = window.requestAnimationFrame(clock);
    }
    function positionTarget() {
        if (!target || !state.position) return;
        const padding = 18;
        const width = Math.max(0, arena.clientWidth - target.offsetWidth - padding * 2);
        const height = Math.max(0, arena.clientHeight - target.offsetHeight - padding * 2);
        target.style.left = Math.round(padding + state.position.x * width) + "px";
        target.style.top = Math.round(padding + state.position.y * height) + "px";
    }
    function spawn() {
        if (state.mode === "aim" && performance.now() >= state.deadline) { finish(); return; }
        let position;
        for (let attempt = 0; attempt < 8; attempt++) {
            position = { x: Math.random(), y: Math.random() };
            if (!state.position || Math.hypot(position.x - state.position.x, position.y - state.position.y) > .25) break;
        }
        state.position = position;
        target = document.createElement("button"); target.type = "button"; target.className = "hs-target";
        target.setAttribute("aria-label", "Zasáhnout terč");
        const image = document.createElement("img"); image.src = headSource; image.alt = ""; image.draggable = false;
        target.append(image); arena.append(target); positionTarget();
        state.visibleAt = performance.now(); state.phase = "active";
        $("hint").textContent = "TERČ NA PLOŠE / TREF HLAVU";
        announce("Terč se objevil.");
    }
    function nextTarget() {
        state.phase = "waiting";
        $("hint").textContent = "ČEKEJ NA TERČ…";
        if (state.mode === "reaction") later(spawn, 650 + Math.random() * 1150);
        else spawn();
    }
    function feedback(text, x, y, hit) {
        const pixel = document.createElement("div"); pixel.className = "hs-feedback hs-pop" + (hit ? "" : " hs-miss");
        pixel.textContent = text;
        pixel.style.left = Math.max(40, Math.min(arena.clientWidth - 70, x)) + "px";
        pixel.style.top = Math.max(22, Math.min(arena.clientHeight - 50, y)) + "px";
        arena.append(pixel); later(() => pixel.remove(), 600);
        if (hit) { arena.classList.remove("hs-hit"); void arena.offsetWidth; arena.classList.add("hs-hit"); later(() => arena.classList.remove("hs-hit"), 100); }
    }
    function shot(event) {
        if (state.phase !== "active") return;
        const now = performance.now();
        if (state.mode === "aim" && now >= state.deadline) { finish(); return; }
        const hit = event.target.closest(".hs-target") === target;
        const rect = arena.getBoundingClientRect();
        const x = event.clientX ? event.clientX - rect.left : parseFloat(target.style.left) + target.offsetWidth / 2;
        const y = event.clientY ? event.clientY - rect.top : parseFloat(target.style.top);
        if (!hit) {
            state.misses++; feedback("MISS", x, y, false); updateHud(now); return;
        }
        // Remove the target and change phase before another event can score it.
        state.phase = "waiting";
        const reaction = Math.max(.01, now - state.visibleAt);
        state.hits++; state.times.push(reaction);
        target.remove(); target = null;
        if (event.type === "keydown") arena.focus({ preventScroll: true });
        feedback(Math.round(reaction) + " MS", x, y, true); updateHud(now);
        announce("Zásah. " + Math.round(reaction) + " milisekund.");
        if (state.mode === "reaction" && state.hits === 10) finish();
        else nextTarget();
    }
    function finish() {
        if (!["active", "waiting"].includes(state.phase)) return;
        clearWork(); state.phase = "results";
        if (state.mode === "aim") state.deadline = performance.now();
        updateHud();
        const result = { mode: state.mode, hits: state.hits, misses: state.misses, average: average(state.times), best: state.times.length ? Math.min(...state.times) : 0, date: new Date().toISOString() };
        const newBest = (result.best && (!records.bestReaction || result.best < records.bestReaction)) ||
            (result.mode === "reaction" && result.average && (!records.bestAverage || result.average < records.bestAverage)) ||
            (result.mode === "aim" && result.hits > records.bestAim);
        if (result.best) records.bestReaction = records.bestReaction ? Math.min(records.bestReaction, result.best) : result.best;
        if (result.mode === "reaction" && result.average) records.bestAverage = records.bestAverage ? Math.min(records.bestAverage, result.average) : result.average;
        if (result.mode === "aim") records.bestAim = Math.max(records.bestAim, result.hits);
        records.recent.unshift(result); records.recent = records.recent.slice(0, 10);
        try { localStorage.setItem(key, JSON.stringify(records)); } catch { /* Session records remain available. */ }
        $("hint").textContent = newBest ? "★ NOVÝ OSOBNÍ REKORD ★" : "TRÉNINK DOKONČEN / GG";
        const content = showScreen(newBest ? "★ PERSONAL BEST" : "ROUND COMPLETE", "DOBRÁ MUŠKA!", result.mode === "reaction" ? "Deset terčů za tebou. Další pokus může být ještě rychlejší." : "Čas vypršel. Každý přesný zásah se počítá.");
        const summary = document.createElement("div"); summary.className = "hs-result-grid";
        summary.append(stat("SKÓRE", result.hits), stat("PŘESNOST", accuracy() + "%"), stat("PRŮMĚR", ms(result.average)), stat("NEJRYCHLEJŠÍ", ms(result.best)));
        const record = document.createElement("p"); record.className = "hs-record-note";
        record.textContent = result.mode === "reaction" ? "NEJLEPŠÍ PRŮMĚR / " + ms(records.bestAverage) : "NEJLEPŠÍ SKÓRE / " + records.bestAim;
        const controls = document.createElement("div"); controls.className = "hs-actions";
        controls.append(action("JEŠTĚ JEDNOU ↗", () => start(state.mode)), action("HLAVNÍ MENU", menu, true));
        content.append(summary, record, controls); announce("Trénink dokončen. Skóre " + result.hits + ", přesnost " + accuracy() + " procent."); focusScreen();
    }
    function showRecords() {
        clearWork(); state.phase = "records";
        const content = showScreen("LOCAL RECORDS / V TOMHLE PROHLÍŽEČI", "TVOJE REKORDY", "Deset posledních dokončených tréninků. Nejlepší průměr patří jen plnému testu deseti reakcí.");
        const summary = document.createElement("div"); summary.className = "hs-result-grid";
        summary.append(stat("NEJRYCHLEJŠÍ REAKCE", ms(records.bestReaction)), stat("NEJLEPŠÍ PRŮMĚR", ms(records.bestAverage)), stat("AIM / NEJVÍC ZÁSAHŮ", records.bestAim)); content.append(summary);
        const list = document.createElement("ol"); list.className = "hs-history";
        for (const result of records.recent) {
            const item = document.createElement("li");
            item.textContent = modes[result.mode] + " · " + result.hits + " HITS · " + ms(result.average) + " · " + new Date(result.date).toLocaleDateString("cs-CZ"); list.append(item);
        }
        if (!records.recent.length) { const empty = document.createElement("li"); empty.textContent = "Zatím žádný dokončený trénink. Tvůj první rekord čeká."; list.append(empty); }
        content.append(list, action("← HLAVNÍ MENU", menu, true)); focusScreen();
    }
    function pause() {
        if (!["countdown", "active", "waiting"].includes(state.phase)) return;
        state.remaining = state.started ? Math.max(0, state.deadline - performance.now()) : 30000;
        if (state.mode === "aim" && state.started && state.remaining === 0) { finish(); return; }
        clearWork(); state.phase = "paused"; updateHud();
        const content = showScreen("PAUZA / NIC TI NEUTEČE", "TRÉNINK POZASTAVEN", "Záložka byla skrytá. Pokračuj, až budeš připravený. Zásahy i zbývající čas zůstávají.");
        content.append(action("POKRAČOVAT ↗", countdown), action("HLAVNÍ MENU", menu, true)); focusScreen();
    }
    function close() {
        if (!dialog?.open) return;
        clearWork(); sessionEvents.abort(); observer.disconnect(); dialog.close();
        for (const [element, properties] of scrollState.styles) for (const [name, value, priority] of properties) {
            if (value) element.style.setProperty(name, value, priority); else element.style.removeProperty(name);
        }
        window.scrollTo({ left: scrollState.x, top: scrollState.y, behavior: "instant" });
        previousFocus?.isConnected && previousFocus.focus({ preventScroll: true });
        state.phase = "closed";
    }
    function create() {
        dialog = document.createElement("dialog"); dialog.className = "headshot-game";
        dialog.setAttribute("aria-labelledby", "hs-title");
        dialog.innerHTML = `<header class="hs-header"><div class="hs-brand"><span class="hs-brand-icon" aria-hidden="true">⌖</span><h1 id="hs-title">VOJTA.EXE <span>// HEADSHOT TRAINER</span></h1></div><div class="hs-round"><span data-hs="mode">REACTION TEST</span><strong data-hs="timer">0 / 10</strong></div><button type="button" class="hs-exit" aria-label="Zavřít trénink">×</button></header>
            <div class="hs-arena" tabindex="-1" aria-label="Pixelová tréninková střelnice"><div class="hs-room-label" aria-hidden="true">TRAINING ROOM <span>SECTOR 03 / VOJTA.EXE</span></div><div class="hs-screen"></div></div>
            <footer class="hs-footer"><div class="hs-progress" aria-hidden="true"><span data-hs="progress"></span></div><div class="hs-hud"><div><span>HITS</span><strong data-hs="hits">0</strong></div><div><span>MISSES</span><strong data-hs="misses">0</strong></div><div><span>ACCURACY</span><strong data-hs="accuracy">—</strong></div><div><span>AVG REACTION</span><strong data-hs="average">—</strong></div><div><span>BEST REACTION</span><strong data-hs="best">—</strong></div></div><div class="hs-statusline"><span data-hs="hint">TAJNÁ MÍSTNOST</span><button type="button" class="hs-menu-button">← MENU</button></div></footer><p class="hs-sr" role="status" aria-live="polite" aria-atomic="true"></p>`;
        document.body.append(dialog);
        arena = dialog.querySelector(".hs-arena"); screen = dialog.querySelector(".hs-screen"); live = dialog.querySelector(".hs-sr");
        dialog.querySelector(".hs-exit").addEventListener("click", close);
        dialog.querySelector(".hs-menu-button").addEventListener("click", menu);
        dialog.addEventListener("cancel", event => { event.preventDefault(); event.stopPropagation(); close(); });
        // Keep the portfolio's own keyboard handlers out of the modal game.
        dialog.addEventListener("keydown", event => {
            event.stopPropagation();
            if (["Enter", " "].includes(event.key) && event.target.closest(".hs-target")) {
                event.preventDefault();
                if (!event.repeat) shot(event);
                return;
            }
            if (event.key !== "Tab") return;
            const buttons = [...dialog.querySelectorAll("button")].filter(button => !button.disabled && button.getClientRects().length);
            const first = buttons[0], last = buttons[buttons.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === arena)) {
                event.preventDefault(); last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === arena)) {
                event.preventDefault(); (document.activeElement === arena && target ? target : first).focus();
            }
        });
        arena.addEventListener("pointerdown", event => {
            if (event.button !== 0 || event.target.closest(".hs-screen")) return;
            event.preventDefault(); shot(event);
        });
        arena.addEventListener("click", event => { if (event.detail === 0 && event.target.closest(".hs-target")) shot(event); });
        observer = new ResizeObserver(positionTarget);
    }
    window.VojtaHeadshot = Object.freeze({ open() {
        if (!dialog) create();
        if (dialog.open) return;
        previousFocus = document.activeElement;
        scrollState = { x: scrollX, y: scrollY, styles: [
            [document.documentElement, ["overflow"]], [document.body, ["overflow", "position", "top", "left", "width"]]
        ].map(([element, names]) => [element, names.map(name => [name, element.style.getPropertyValue(name), element.style.getPropertyPriority(name)])]) };
        window.dispatchEvent(new CustomEvent("vojta:gameopen"));
        document.documentElement.style.overflow = "hidden";
        Object.assign(document.body.style, { overflow: "hidden", position: "fixed", top: -scrollState.y + "px", left: -scrollState.x + "px", width: "100%" });
        sessionEvents = new AbortController();
        document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); }, { signal: sessionEvents.signal });
        window.addEventListener("pagehide", close, { signal: sessionEvents.signal });
        observer.observe(arena);
        dialog.showModal(); menu();
    } });
})();
