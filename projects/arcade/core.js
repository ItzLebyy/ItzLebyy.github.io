// Pure game rules, shared by the arcade UI and its checks.
(() => {
    "use strict";
    function shuffle(items, random = Math.random) {
        const result = [...items];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    function handValue(hand) {
        let total = 0;
        let aces = 0;
        for (const card of hand) {
            if (card.rank === "A") { total += 11; aces++; }
            else total += ["J", "Q", "K"].includes(card.rank) ? 10 : Number(card.rank);
        }
        while (total > 21 && aces > 0) { total -= 10; aces--; }
        return { total, soft: aces > 0, natural: hand.length === 2 && total === 21 };
    }

    function settleBlackjack(state) {
        const player = handValue(state.player);
        const dealer = handValue(state.dealer);
        let result;
        let reason;
        if (player.total > 21) { result = "loss"; reason = "player-bust"; }
        else if (player.natural || dealer.natural) {
            result = player.natural === dealer.natural ? "push" : player.natural ? "win" : "loss";
            reason = "blackjack";
        } else if (dealer.total > 21) { result = "win"; reason = "dealer-bust"; }
        else { result = player.total === dealer.total ? "push" : player.total > dealer.total ? "win" : "loss"; reason = "points"; }
        return { ...state, phase: "done", result, reason };
    }

    function dealBlackjack(random = Math.random) {
        const deck = shuffle(["♠", "♥", "♦", "♣"].flatMap(suit =>
            ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"].map(rank => ({ rank, suit }))), random);
        const player = [deck.pop()];
        const dealer = [deck.pop()];
        player.push(deck.pop()); dealer.push(deck.pop());
        const state = { deck, player, dealer, phase: "player", result: null, reason: null };
        return handValue(player).natural || handValue(dealer).natural ? settleBlackjack(state) : state;
    }

    function standBlackjack(state) {
        if (state.phase !== "player") return state;
        const deck = [...state.deck];
        const dealer = [...state.dealer];
        // Dealer stands on every 17, including soft 17.
        while (handValue(dealer).total < 17 && deck.length) dealer.push(deck.pop());
        return settleBlackjack({ ...state, deck, dealer });
    }

    function hitBlackjack(state) {
        if (state.phase !== "player" || !state.deck.length) return state;
        const deck = [...state.deck];
        const player = [...state.player, deck.pop()];
        const next = { ...state, deck, player };
        if (handValue(player).total > 21) return settleBlackjack(next);
        return handValue(player).total === 21 ? standBlackjack(next) : next;
    }

    function snakeFood(snake, size, random = Math.random) {
        const occupied = new Set(snake.map(cell => cell.x + "," + cell.y));
        const empty = [];
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            if (!occupied.has(x + "," + y)) empty.push({ x, y });
        }
        return empty.length ? empty[Math.floor(random() * empty.length)] : null;
    }

    function newSnake(size = 18, random = Math.random) {
        const middle = Math.floor(size / 2);
        const snake = [{ x: middle, y: middle }, { x: middle - 1, y: middle }, { x: middle - 2, y: middle }];
        return { size, snake, direction: { x: 1, y: 0 }, food: snakeFood(snake, size, random), score: 0, over: false, won: false };
    }

    function stepSnake(state, requested = state.direction, random = Math.random) {
        if (state.over) return state;
        const valid = Math.abs(requested.x) + Math.abs(requested.y) === 1;
        const opposite = requested.x === -state.direction.x && requested.y === -state.direction.y;
        const direction = valid && !opposite ? requested : state.direction;
        const head = { x: state.snake[0].x + direction.x, y: state.snake[0].y + direction.y };
        const eating = state.food && head.x === state.food.x && head.y === state.food.y;
        const body = eating ? state.snake : state.snake.slice(0, -1);
        const collision = head.x < 0 || head.y < 0 || head.x >= state.size || head.y >= state.size || body.some(cell => cell.x === head.x && cell.y === head.y);
        if (collision) return { ...state, direction, over: true };
        const snake = [head, ...state.snake];
        if (!eating) snake.pop();
        const food = eating ? snakeFood(snake, state.size, random) : state.food;
        return { ...state, snake, direction, food, score: state.score + (eating ? 1 : 0), over: !food, won: !food };
    }

    window.ArcadeCore = Object.freeze({ shuffle, handValue, dealBlackjack, hitBlackjack, standBlackjack, settleBlackjack, snakeFood, newSnake, stepSnake });
})();
