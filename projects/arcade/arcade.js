(() => {
    "use strict";
    const core = window.ArcadeCore;
    const byId = id => document.getElementById(id);
    const storageKey = "vojta.arcade.v1";
    const integer = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { /* Storage is optional. */ }
    const records = {
        wins: integer(saved.wins), losses: integer(saved.losses), pushes: integer(saved.pushes),
        snake: integer(saved.snake), reaction: integer(saved.reaction)
    };
    function persist() { try { localStorage.setItem(storageKey, JSON.stringify(records)); } catch { /* Keep playing in memory. */ } }
    function showRecords() {
        byId("blackjack-wins").textContent = records.wins;
        byId("blackjack-losses").textContent = records.losses;
        byId("blackjack-pushes").textContent = records.pushes;
        byId("snake-best").textContent = records.snake;
        byId("reaction-best").textContent = records.reaction ? records.reaction + " ms" : "—";
    }

    // Blackjack: no hidden card values are rendered until the dealer reveals.
    let round = null;
    let roundRecorded = false;
    let blackjackBusy = false;
    const cardAnimations = new Set();
    const suitNames = { "♠": "piky", "♥": "srdce", "♦": "káry", "♣": "kříže" };
    function cardElement(card, concealed) {
        const element = document.createElement("div");
        element.className = "playing-card";
        element.setAttribute("role", "img");
        if (concealed) {
            element.classList.add("face-down");
            element.setAttribute("aria-label", "Skrytá karta");
            element.textContent = ">_";
        } else {
            if (["♥", "♦"].includes(card.suit)) element.classList.add("red");
            element.setAttribute("aria-label", card.rank + ", " + suitNames[card.suit]);
            for (const className of ["card-corner", "card-suit", "card-corner bottom"]) {
                const span = document.createElement("span");
                span.className = className;
                span.setAttribute("aria-hidden", "true");
                span.textContent = className === "card-suit" ? card.suit : card.rank;
                element.appendChild(span);
            }
        }
        return element;
    }
    function renderBlackjack() {
        const playing = round && round.phase === "player";
        const playerCards = round ? round.player : [null, null];
        const dealerCards = round ? round.dealer : [null, null];
        byId("player-cards").replaceChildren(...playerCards.map(card => cardElement(card, !round)));
        byId("dealer-cards").replaceChildren(...dealerCards.map((card, index) => cardElement(card, !round || (playing && index === 1))));
        byId("player-total").textContent = round ? core.handValue(round.player).total : "—";
        byId("dealer-total").textContent = !round ? "—" : playing ? core.handValue([round.dealer[0]]).total + " + ?" : core.handValue(round.dealer).total;
        byId("deal").disabled = Boolean(playing);
        byId("deal").textContent = round ? "Další kolo ↗" : "Rozdat karty ↗";
        byId("hit").disabled = !playing;
        byId("stand").disabled = !playing;
        const status = byId("blackjack-status");
        status.dataset.result = round && round.result || "";
        if (!round) return;
        if (playing) { status.textContent = "Jsi na tahu. Další kartu, nebo zůstat?"; return; }
        if (!roundRecorded) {
            records[round.result === "win" ? "wins" : round.result === "loss" ? "losses" : "pushes"]++;
            roundRecorded = true;
            persist(); showRecords();
        }
        const player = core.handValue(round.player).total;
        const dealer = core.handValue(round.dealer).total;
        if (round.result === "push") status.textContent = round.reason === "blackjack" ? "Oba máte blackjack. Remíza!" : "Stejný součet. Remíza!";
        else if (round.reason === "player-bust") status.textContent = "Máš " + player + ". Přes 21 — tohle kolo bere dealer.";
        else if (round.reason === "dealer-bust") status.textContent = "Dealer má " + dealer + ". Přes 21 — vyhráváš!";
        else if (round.reason === "blackjack") status.textContent = round.result === "win" ? "Blackjack! Eso a desítka. Vyhráváš." : "Dealer má blackjack. Příště to vyjde!";
        else status.textContent = (round.result === "win" ? "Vyhráváš! " : "Vyhrává dealer. ") + player + " : " + dealer;
    }
    function finishCardAnimations() { cardAnimations.forEach(animation => animation.finish()); }
    async function animateCard(element, frames, duration) {
        if (document.hidden || byId("panel-blackjack").hidden || !element.animate) return;
        const animation = element.animate(frames, { duration, easing: "cubic-bezier(.2,.7,.25,1)" });
        cardAnimations.add(animation);
        try { await animation.finished; } catch { /* A cancelled animation should still finish the turn. */ }
        finally { cardAnimations.delete(animation); }
    }
    const reducedCardMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    async function dealCard(hand, card, concealed = false) {
        const element = cardElement(card, concealed);
        byId(hand + "-cards").appendChild(element);
        const origin = byId("card-deck").getBoundingClientRect();
        const target = element.getBoundingClientRect();
        const x = origin.x + origin.width / 2 - target.x - target.width / 2;
        const y = origin.y + origin.height / 2 - target.y - target.height / 2;
        if (reducedCardMotion()) await animateCard(element, [{ opacity: 0 }, { opacity: 1 }], 180);
        else await animateCard(element, [
            { transform: `translate(${x}px, ${y}px) rotate(-10deg) scale(.65)`, opacity: .4 },
            { transform: "translate(0, 0) rotate(0) scale(1)", opacity: 1 }
        ], 340);
    }
    async function revealDealer(card) {
        const back = byId("dealer-cards").children[1];
        if (!back || !back.classList.contains("face-down")) return;
        const reduced = reducedCardMotion();
        await animateCard(back, reduced ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: "rotateY(0deg)" }, { transform: "rotateY(90deg)" }], reduced ? 90 : 130);
        const face = cardElement(card, false);
        back.replaceWith(face);
        await animateCard(face, reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: "rotateY(-90deg)" }, { transform: "rotateY(0deg)" }], reduced ? 90 : 130);
    }
    async function playBlackjack(action) {
        if (blackjackBusy || (action === "deal" ? round?.phase === "player" : round?.phase !== "player")) return;
        const next = action === "deal" ? core.dealBlackjack() : action === "hit" ? core.hitBlackjack(round) : core.standBlackjack(round);
        blackjackBusy = true;
        const stage = document.querySelector(".blackjack-stage");
        stage.setAttribute("aria-busy", "true");
        for (const id of ["deal", "hit", "stand"]) byId(id).disabled = true;
        const status = byId("blackjack-status");
        status.dataset.result = "";
        status.textContent = action === "deal" ? "Rozdávám karty…" : action === "hit" ? "Ještě jednu kartu…" : "Dealer je na tahu…";
        try {
            if (action === "deal") {
                roundRecorded = false;
                byId("player-cards").replaceChildren();
                byId("dealer-cards").replaceChildren();
                byId("player-total").textContent = "—";
                byId("dealer-total").textContent = "—";
                for (let index = 0; index < 2; index++) {
                    await dealCard("player", next.player[index]);
                    byId("player-total").textContent = core.handValue(next.player.slice(0, index + 1)).total;
                    await dealCard("dealer", next.dealer[index], index === 1);
                    byId("dealer-total").textContent = core.handValue([next.dealer[0]]).total + " + ?";
                }
            } else if (action === "hit") {
                await dealCard("player", next.player[next.player.length - 1]);
                byId("player-total").textContent = core.handValue(next.player).total;
            }
            if (next.phase === "done") {
                status.textContent = "Dealer otáčí karty…";
                await revealDealer(next.dealer[1]);
                byId("dealer-total").textContent = core.handValue(next.dealer.slice(0, 2)).total;
                for (let index = 2; index < next.dealer.length; index++) {
                    await dealCard("dealer", next.dealer[index]);
                    byId("dealer-total").textContent = core.handValue(next.dealer.slice(0, index + 1)).total;
                }
            }
        } finally {
            round = next;
            blackjackBusy = false;
            stage.setAttribute("aria-busy", "false");
            renderBlackjack();
        }
    }
    for (const action of ["deal", "hit", "stand"]) byId(action).addEventListener("click", () => playBlackjack(action));

    // Snake: only one turn is queued per tick, so fast input cannot reverse the snake.
    const canvas = byId("snake-board");
    const context = canvas.getContext("2d");
    let snake = core.newSnake();
    let snakeTimer = null;
    let running = false;
    let started = false;
    let queuedTurn = null;
    let activeGame = "blackjack";
    const directions = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    function drawSnake() {
        const cell = canvas.width / snake.size;
        const palette = getComputedStyle(document.documentElement);
        const color = name => palette.getPropertyValue(name).trim();
        context.fillStyle = color("--board-background");
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = color("--board-cell");
        for (let y = 0; y < snake.size; y++) for (let x = 0; x < snake.size; x++) {
            if ((x + y) % 2 === 0) context.fillRect(x * cell, y * cell, cell, cell);
        }
        if (snake.food) {
            const x = snake.food.x * cell; const y = snake.food.y * cell;
            context.fillStyle = color("--syntax-pink");
            context.fillRect(x + 4, y + 4, cell - 8, cell - 8);
            context.fillStyle = color("--text");
            context.fillRect(x + 5, y + 5, 4, 4);
        }
        snake.snake.forEach((part, index) => {
            context.fillStyle = color(index === 0 ? "--tea" : "--syntax-mint");
            context.fillRect(part.x * cell + 1, part.y * cell + 1, cell - 2, cell - 2);
        });
        const head = snake.snake[0];
        context.fillStyle = color("--ink");
        const horizontal = snake.direction.x !== 0;
        const eyeX = head.x * cell + (horizontal ? (snake.direction.x > 0 ? 13 : 4) : 5);
        const eyeY = head.y * cell + (horizontal ? 5 : (snake.direction.y > 0 ? 13 : 4));
        context.fillRect(eyeX, eyeY, 3, 3);
        context.fillRect(eyeX + (horizontal ? 0 : 7), eyeY + (horizontal ? 7 : 0), 3, 3);
        if (!running) {
            context.fillStyle = color("--board-overlay");
            context.fillRect(35, 145, 290, 70);
            context.fillStyle = color("--text");
            context.textAlign = "center";
            context.font = '28px "Pixelify Sans", monospace';
            context.fillText(snake.over ? (snake.won ? "CELÁ PLOCHA JE TVOJE!" : "JEŠTĚ JEDEN POKUS?") : started ? "PAUZA" : "PŘIPRAVEN?", 180, 188, 280);
        }
    }
    function updateSnakeControls() {
        byId("snake-score").textContent = snake.score;
        byId("snake-start").disabled = running || (started && !snake.over);
        byId("snake-start").textContent = snake.over ? "Zkusit znovu ↗" : "Spustit hru ↗";
        byId("snake-pause").disabled = !started || snake.over;
        byId("snake-pause").textContent = running ? "Pauza" : "Pokračovat";
    }
    function pauseSnake() {
        if (!running) return;
        running = false;
        window.clearTimeout(snakeTimer);
        snakeTimer = null;
        byId("snake-status").textContent = "Pozastaveno. Až budeš chtít, pokračuj.";
        updateSnakeControls(); drawSnake();
    }
    function tickSnake() {
        if (!running) return;
        snake = core.stepSnake(snake, queuedTurn || snake.direction);
        queuedTurn = null;
        if (snake.score > records.snake) { records.snake = snake.score; persist(); showRecords(); }
        if (snake.over) {
            running = false;
            byId("snake-status").textContent = snake.won ? "Neuvěřitelné! Zaplnil jsi celou herní plochu." : "Konec hry. Skóre: " + snake.score + ". Ještě jeden pokus?";
        }
        updateSnakeControls(); drawSnake();
        if (running) snakeTimer = window.setTimeout(tickSnake, Math.max(70, 150 - snake.score * 4));
    }
    function resumeSnake() {
        if (!started || snake.over || running || activeGame !== "snake") return;
        running = true;
        byId("snake-status").textContent = "Šipky nebo W A S D. Mezerník = pauza.";
        updateSnakeControls(); drawSnake();
        snakeTimer = window.setTimeout(tickSnake, Math.max(70, 150 - snake.score * 4));
    }
    function turnSnake(name) {
        if (!running || queuedTurn) return;
        const requested = directions[name];
        if (requested.x === -snake.direction.x && requested.y === -snake.direction.y) return;
        if (requested.x === snake.direction.x && requested.y === snake.direction.y) return;
        queuedTurn = requested;
    }
    byId("snake-start").addEventListener("click", () => {
        window.clearTimeout(snakeTimer);
        snake = core.newSnake(); queuedTurn = null; started = true; running = false;
        resumeSnake(); canvas.focus({ preventScroll: true });
    });
    byId("snake-pause").addEventListener("click", () => { if (running) pauseSnake(); else resumeSnake(); });
    document.querySelectorAll("[data-direction]").forEach(button => button.addEventListener("click", () => turnSnake(button.dataset.direction)));
    document.addEventListener("keydown", event => {
        if (activeGame !== "snake" || event.target.closest('input, textarea, [contenteditable="true"], [role="tablist"]')) return;
        const key = event.key.toLowerCase();
        const map = { arrowup: "up", w: "up", arrowdown: "down", s: "down", arrowleft: "left", a: "left", arrowright: "right", d: "right" };
        if (map[key] && running) { event.preventDefault(); turnSnake(map[key]); }
        if (key === " " && started && !snake.over && event.target.tagName !== "BUTTON") {
            event.preventDefault(); if (!event.repeat) { if (running) pauseSnake(); else resumeSnake(); }
        }
    });

    // Reaction test: cancelled waits never produce a score.
    let reactionState = "idle";
    let reactionTimer = null;
    let readyFrame = null;
    let readyAt = 0;
    const recent = [];
    function reactionView(state, title, detail) {
        reactionState = state;
        byId("reaction-pad").dataset.state = state;
        byId("reaction-instruction").textContent = title;
        byId("reaction-detail").textContent = detail;
    }
    function cancelReaction() {
        window.clearTimeout(reactionTimer); window.cancelAnimationFrame(readyFrame);
        reactionTimer = null; readyFrame = null;
        if (["waiting", "ready"].includes(reactionState)) {
            reactionView("idle", "Klikni pro start", "Pokus byl pozastaven. Můžeš začít znovu.");
            byId("reaction-status").textContent = "Můžeš použít i Enter nebo mezerník.";
        }
    }
    function react() {
        if (activeGame !== "reaction" || document.hidden) return;
        if (reactionState === "waiting") {
            window.clearTimeout(reactionTimer); window.cancelAnimationFrame(readyFrame);
            reactionView("early", "Moc brzo!", "Klikni a zkus to znovu. Tentokrát počkej na zelenou.");
            byId("reaction-status").textContent = "Předčasný klik se nepočítá.";
        } else if (reactionState === "ready") {
            const elapsed = Math.max(1, Math.round(performance.now() - readyAt));
            const best = !records.reaction || elapsed < records.reaction;
            if (best) { records.reaction = elapsed; persist(); showRecords(); }
            byId("reaction-last").textContent = elapsed + " ms";
            reactionView("result", elapsed + " ms", best ? "Nový osobní rekord! Klikni pro další pokus." : "Pěkný pokus. Klikni a zkus to ještě jednou.");
            byId("reaction-status").textContent = best ? "Nový rekord: " + elapsed + " ms!" : "Tvůj čas: " + elapsed + " ms.";
            recent.unshift(elapsed); recent.splice(5);
            byId("reaction-history").replaceChildren(...recent.map(value => { const li = document.createElement("li"); li.textContent = value + " ms"; return li; }));
        } else {
            reactionView("waiting", "Ještě čekej…", "Až uvidíš zelenou a TEĎ!, klikni.");
            byId("reaction-status").textContent = "Pokus běží. Počkej na zelenou.";
            reactionTimer = window.setTimeout(() => {
                readyFrame = window.requestAnimationFrame(() => {
                    if (reactionState !== "waiting" || activeGame !== "reaction" || document.hidden) return;
                    reactionView("ready", "TEĎ!", "Klikni!");
                    readyAt = performance.now();
                });
            }, 1400 + Math.random() * 2200);
        }
    }
    byId("reaction-pad").addEventListener("pointerdown", event => {
        if (event.button !== 0) return;
        event.preventDefault(); byId("reaction-pad").focus({ preventScroll: true }); react();
    });
    byId("reaction-pad").addEventListener("keydown", event => {
        if ([" ", "Enter"].includes(event.key)) { event.preventDefault(); if (!event.repeat) react(); }
    });
    // A generated click (for example, from assistive technology) has no pointer event.
    byId("reaction-pad").addEventListener("click", event => { if (event.detail === 0) react(); });

    // Tabs support deep links, keyboard navigation and clean game lifecycles.
    const tabs = [...document.querySelectorAll("[data-game]")];
    function selectGame(name, writeHash = true) {
        if (!tabs.some(tab => tab.dataset.game === name)) name = "blackjack";
        if (name !== activeGame) { pauseSnake(); cancelReaction(); }
        activeGame = name;
        if (name !== "blackjack") finishCardAnimations();
        tabs.forEach(tab => {
            const selected = tab.dataset.game === name;
            tab.setAttribute("aria-selected", String(selected));
            tab.tabIndex = selected ? 0 : -1;
            byId(tab.getAttribute("aria-controls")).hidden = !selected;
        });
        if (writeHash && location.hash !== "#" + name) history.replaceState(null, "", "#" + name);
        if (name === "snake") drawSnake();
    }
    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => selectGame(tab.dataset.game));
        tab.addEventListener("keydown", event => {
            let next;
            if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
            if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
            if (event.key === "Home") next = 0;
            if (event.key === "End") next = tabs.length - 1;
            if (next !== undefined) { event.preventDefault(); selectGame(tabs[next].dataset.game); tabs[next].focus(); }
        });
    });
    window.addEventListener("hashchange", () => selectGame(location.hash.slice(1), false));
    document.addEventListener("visibilitychange", () => { if (document.hidden) { pauseSnake(); cancelReaction(); finishCardAnimations(); } });
    window.addEventListener("pagehide", () => { pauseSnake(); cancelReaction(); });
    window.addEventListener("vojta:gameopen", () => { pauseSnake(); cancelReaction(); finishCardAnimations(); });
    showRecords(); renderBlackjack(); updateSnakeControls(); drawSnake();
    document.fonts.ready.then(drawSnake);
    window.addEventListener("vojta:palettechange", drawSnake);
    selectGame(location.hash.slice(1), false);
})();
