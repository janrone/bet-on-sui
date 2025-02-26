/*
/// Module: bet_game
module bet_game::bet_game;
*/

module bet_game::game {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::table::{Self, Table};
    use sui::event;
    use std::vector;

    // ====== 错误码 ======
    const E_GAME_NOT_ACTIVE: u64 = 0;
    const E_INVALID_BET_AMOUNT: u64 = 1;
    const E_INVALID_CHOICE: u64 = 2;
    const E_UNAUTHORIZED: u64 = 3;
    const E_ALREADY_SETTLED: u64 = 4;

    // ====== 常量 ======
    const MIN_BET_AMOUNT: u64 = 1_000_000; // 1 SUI
    const FEE_RATE: u64 = 5; // 5% 手续费

    // ====== 结构体 ======
    public struct GameState has key {
        id: UID,
        owner: address,
        active: bool,
        total_bets: u64,
        carry_over: u64, //历史累计奖金
        bets: Table<address, Bet>,
        house_balance: Coin<SUI>,
        players: vector<address>
    }

    public struct Bet has store, drop {
        amount: u64,
        choice: u8
    }

    // ====== 事件 ======
    public struct BetPlaced has copy, drop {
        player: address,
        amount: u64,
        choice: u8
    }

    public struct GameSettled has copy, drop {
        winning_choice: u8,
        total_prize_pool: u64,
        winners_count: u64
    }

    // ====== 初始化 ======
    fun init(ctx: &mut TxContext) {
        let game_state = GameState {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            active: true,
            total_bets: 0,
            carry_over: 0,
            bets: table::new(ctx),
            house_balance: coin::zero(ctx),
            players: vector::empty(),
        };
        transfer::share_object(game_state);
    }

    // ====== 公共函数 ======
    // 投注
    public entry fun place_bet(
        game_state: &mut GameState,
        bet_coin: Coin<SUI>,
        choice: u8,
        ctx: &mut TxContext
    ) {
        // 验证游戏状态和投注参数
        assert!(game_state.active, E_GAME_NOT_ACTIVE);
        let bet_amount = coin::value(&bet_coin);
        assert!(bet_amount >= MIN_BET_AMOUNT, E_INVALID_BET_AMOUNT);
        assert!(choice > 0 && choice <= 10, E_INVALID_CHOICE);

        // 将注金额加入游戏资金池
        coin::join(&mut game_state.house_balance, bet_coin);
        
        // 记录投注信息
        let player = tx_context::sender(ctx);
        let bet = Bet {
            amount: bet_amount,
            choice
        };
        
        // 如果玩家已有投注，先移除旧投注
        if (table::contains(&game_state.bets, player)) {
            let old_bet = table::remove(&mut game_state.bets, player);
            game_state.total_bets = game_state.total_bets - old_bet.amount;
        };
        
        // 添加新投注
        table::add(&mut game_state.bets, player, bet);
        game_state.total_bets = game_state.total_bets + bet_amount;

        // 发出投注事件
        event::emit(BetPlaced {
            player,
            amount: bet_amount,
            choice
        });

        if (!vector::contains(&game_state.players, &player)) {
            vector::push_back(&mut game_state.players, player);
        };
    }

    // 结算游戏
    public entry fun settle_game(
        game_state: &mut GameState,
        winning_choice: u8,
        ctx: &mut TxContext
    ) {
        // 验证调用者权限和游戏状态
        assert!(tx_context::sender(ctx) == game_state.owner, E_UNAUTHORIZED);
        assert!(game_state.active, E_ALREADY_SETTLED);
        
        // 分配奖励
        distribute_rewards(game_state, winning_choice, ctx);
        
        // 重置游戏状态
        game_state.active = true;
        
        // 发出结算事件
        event::emit(GameSettled {
            winning_choice,
            total_prize_pool: game_state.total_bets + game_state.carry_over,
            winners_count: count_winners(game_state, winning_choice)
        });
    }

    // ====== 内部函数 ======
    fun distribute_rewards(
        game_state: &mut GameState,
        winning_choice: u8,
        ctx: &mut TxContext
    ) {
        let total_prize_pool = game_state.total_bets + game_state.carry_over;
        let fee = (total_prize_pool * FEE_RATE) / 100;
        let net_prize_pool = total_prize_pool - fee;

        let winning_bets_total = calculate_winning_bets(game_state, winning_choice);

        if (winning_bets_total == 0) {
            game_state.carry_over = net_prize_pool;
            return
        };

        let mut i = 0;
        let len = vector::length(&game_state.players);
        while (i < len) {
            let player = *vector::borrow(&game_state.players, i);
            let bet = table::borrow(&game_state.bets, player);
            if (bet.choice == winning_choice) {
                let reward = (bet.amount * net_prize_pool) / winning_bets_total;
                if (reward > 0) {
                    let reward_coin = coin::split(&mut game_state.house_balance, reward, ctx);
                    transfer::public_transfer(reward_coin, player);
                };
            };
            i = i + 1;
        };

        clear_bets(game_state);
    }

    fun calculate_winning_bets(game_state: &GameState, winning_choice: u8): u64 {
        let mut total = 0u64;
        let mut i = 0;
        let len = vector::length(&game_state.players);
        while (i < len) {
            let player = *vector::borrow(&game_state.players, i);
            let bet = table::borrow(&game_state.bets, player);
            if (bet.choice == winning_choice) {
                total = total + bet.amount;
            };
            i = i + 1;
        };
        total
    }

    fun count_winners(game_state: &GameState, winning_choice: u8): u64 {
        let mut count = 0u64;
        let mut i = 0;
        let len = vector::length(&game_state.players);
        while (i < len) {
            let player = *vector::borrow(&game_state.players, i);
            let bet = table::borrow(&game_state.bets, player);
            if (bet.choice == winning_choice) {
                count = count + 1;
            };
            i = i + 1;
        };
        count
    }

    fun clear_bets(game_state: &mut GameState) {
        while (!vector::is_empty(&game_state.players)) {
            let player = vector::pop_back(&mut game_state.players);
            _ = table::remove(&mut game_state.bets, player);
        };
        game_state.total_bets = 0;
        game_state.carry_over = 0;
    }
}