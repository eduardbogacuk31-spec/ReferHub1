from __future__ import annotations

import hashlib
import hmac
import json
import os
import random
import secrets
import sqlite3
import time
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import parse_qsl

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, Field
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(os.getenv("DATA_DIR", str(BASE_DIR)))
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "rewards.db"

BOT_TOKEN = (os.getenv("BOT_TOKEN") or os.getenv("TELEGRAM_BOT_TOKEN") or "").strip()


def runtime_bot_token() -> str:
    return (os.getenv("BOT_TOKEN") or os.getenv("TELEGRAM_BOT_TOKEN") or BOT_TOKEN or "").strip()


def runtime_webapp_url() -> str:
    return (os.getenv("WEBAPP_URL") or WEBAPP_URL or "").strip().rstrip("/")
BOT_USERNAME = os.getenv("BOT_USERNAME", "ReferHubRewardsBot").strip().lstrip("@")
WEBAPP_URL = os.getenv("WEBAPP_URL", "").strip().rstrip("/")
DEBUG_USER_ID = int(os.getenv("DEBUG_USER_ID", "0") or 0)
REFERRAL_REWARD = int(os.getenv("REFERRAL_REWARD", "10") or 10)

ADMIN_IDS = {
    int(value.strip())
    for value in os.getenv("ADMIN_IDS", "").split(",")
    if value.strip().isdigit()
}

bot_app: Application | None = None


def connect_db():
    db = sqlite3.connect(DB_PATH, timeout=30)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    return db


def init_database():
    with connect_db() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                telegram_id INTEGER PRIMARY KEY,
                username TEXT,
                first_name TEXT NOT NULL,
                balance INTEGER NOT NULL DEFAULT 0,
                total_earned INTEGER NOT NULL DEFAULT 0,
                referrals_count INTEGER NOT NULL DEFAULT 0,
                referrer_id INTEGER,
                created_at INTEGER NOT NULL,
                last_seen INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                reward INTEGER NOT NULL,
                icon TEXT NOT NULL DEFAULT '⭐',
                link TEXT,
                category TEXT NOT NULL DEFAULT 'other',
                verification_type TEXT NOT NULL DEFAULT 'visit',
                telegram_chat_id TEXT,
                wait_seconds INTEGER NOT NULL DEFAULT 5,
                sort_order INTEGER NOT NULL DEFAULT 0,
                max_claims INTEGER NOT NULL DEFAULT 0,
                starts_at INTEGER NOT NULL DEFAULT 0,
                ends_at INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS task_opens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                opened_at INTEGER NOT NULL,
                UNIQUE(task_id, user_id)
            );

            CREATE TABLE IF NOT EXISTS task_claims (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                claimed_at INTEGER NOT NULL,
                UNIQUE(task_id, user_id)
            );

            CREATE TABLE IF NOT EXISTS task_checks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                success INTEGER NOT NULL,
                message TEXT,
                checked_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS spins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                reward INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS gifts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                emoji TEXT NOT NULL,
                price INTEGER NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS gift_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                gift_id INTEGER NOT NULL,
                price INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                admin_note TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                amount INTEGER NOT NULL,
                note TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS referral_rewards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                referrer_id INTEGER NOT NULL,
                referral_id INTEGER NOT NULL,
                amount INTEGER NOT NULL,
                reward_type TEXT NOT NULL DEFAULT 'signup',
                created_at INTEGER NOT NULL,
                UNIQUE(referrer_id, referral_id, reward_type)
            );

            CREATE TABLE IF NOT EXISTS game_settings (
                game_key TEXT PRIMARY KEY,
                is_active INTEGER NOT NULL DEFAULT 1,
                min_bet INTEGER NOT NULL DEFAULT 1,
                max_bet INTEGER NOT NULL DEFAULT 100,
                daily_limit INTEGER NOT NULL DEFAULT 0,
                cooldown_seconds INTEGER NOT NULL DEFAULT 0,
                config_json TEXT NOT NULL DEFAULT '{}'
            );

            CREATE TABLE IF NOT EXISTS game_plays (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                game_key TEXT NOT NULL,
                bet INTEGER NOT NULL DEFAULT 0,
                reward INTEGER NOT NULL DEFAULT 0,
                result_text TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS daily_claims (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                reward INTEGER NOT NULL,
                streak INTEGER NOT NULL,
                claimed_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS promo_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                discount_percent INTEGER NOT NULL,
                max_uses INTEGER NOT NULL DEFAULT 0,
                uses_count INTEGER NOT NULL DEFAULT 0,
                expires_at INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                icon TEXT NOT NULL DEFAULT '🏆',
                condition_type TEXT NOT NULL,
                condition_value INTEGER NOT NULL,
                reward INTEGER NOT NULL DEFAULT 0,
                xp_reward INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS user_achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                achievement_id INTEGER NOT NULL,
                claimed INTEGER NOT NULL DEFAULT 0,
                unlocked_at INTEGER NOT NULL,
                claimed_at INTEGER,
                UNIQUE(user_id, achievement_id)
            );

            CREATE TABLE IF NOT EXISTS daily_missions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                mission_type TEXT NOT NULL,
                target_value INTEGER NOT NULL,
                reward INTEGER NOT NULL,
                xp_reward INTEGER NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS mission_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                mission_id INTEGER NOT NULL,
                mission_date TEXT NOT NULL,
                progress INTEGER NOT NULL DEFAULT 0,
                claimed INTEGER NOT NULL DEFAULT 0,
                UNIQUE(user_id, mission_id, mission_date)
            );

            CREATE TABLE IF NOT EXISTS tournaments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                starts_at INTEGER NOT NULL,
                ends_at INTEGER NOT NULL,
                prize_1 INTEGER NOT NULL DEFAULT 0,
                prize_2 INTEGER NOT NULL DEFAULT 0,
                prize_3 INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1,
                is_finalized INTEGER NOT NULL DEFAULT 0,
                is_cancelled INTEGER NOT NULL DEFAULT 0,
                finalized_at INTEGER NOT NULL DEFAULT 0,
                cancelled_at INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS tournament_scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tournament_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                score INTEGER NOT NULL DEFAULT 0,
                updated_at INTEGER NOT NULL,
                UNIQUE(tournament_id, user_id)
            );

            CREATE TABLE IF NOT EXISTS seasons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                starts_at INTEGER NOT NULL,
                ends_at INTEGER NOT NULL,
                max_level INTEGER NOT NULL DEFAULT 20,
                xp_per_level INTEGER NOT NULL DEFAULT 100,
                is_active INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS season_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                season_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                season_xp INTEGER NOT NULL DEFAULT 0,
                updated_at INTEGER NOT NULL,
                UNIQUE(season_id, user_id)
            );

            CREATE TABLE IF NOT EXISTS season_rewards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                season_id INTEGER NOT NULL,
                level INTEGER NOT NULL,
                reward_type TEXT NOT NULL DEFAULT 'rh',
                reward_value INTEGER NOT NULL DEFAULT 0,
                title TEXT NOT NULL,
                icon TEXT NOT NULL DEFAULT '🎁',
                UNIQUE(season_id, level)
            );

            CREATE TABLE IF NOT EXISTS season_reward_claims (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                season_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                reward_id INTEGER NOT NULL,
                claimed_at INTEGER NOT NULL,
                UNIQUE(user_id, reward_id)
            );

            CREATE TABLE IF NOT EXISTS season_missions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                season_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                mission_type TEXT NOT NULL,
                target_value INTEGER NOT NULL,
                season_xp_reward INTEGER NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS season_mission_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                season_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                mission_id INTEGER NOT NULL,
                progress INTEGER NOT NULL DEFAULT 0,
                claimed INTEGER NOT NULL DEFAULT 0,
                UNIQUE(season_id, user_id, mission_id)
            );

            CREATE TABLE IF NOT EXISTS tournament_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tournament_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                place INTEGER NOT NULL,
                score INTEGER NOT NULL,
                reward INTEGER NOT NULL DEFAULT 0,
                rewarded_at INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                UNIQUE(tournament_id, place),
                UNIQUE(tournament_id, user_id)
            );

            CREATE TABLE IF NOT EXISTS order_status_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                old_status TEXT,
                new_status TEXT NOT NULL,
                admin_id INTEGER,
                note TEXT,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS admin_action_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id INTEGER NOT NULL,
                target_user_id INTEGER,
                action TEXT NOT NULL,
                details TEXT NOT NULL DEFAULT '',
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS reaction_challenges (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                ready_at_ms INTEGER NOT NULL,
                expires_at_ms INTEGER NOT NULL,
                used INTEGER NOT NULL DEFAULT 0
            );
            """
        )


        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS lotteries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                prize_name TEXT NOT NULL,
                prize_emoji TEXT NOT NULL DEFAULT '🎁',
                ticket_price INTEGER NOT NULL,
                starts_at INTEGER NOT NULL,
                ends_at INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                seed_hash TEXT NOT NULL,
                secret_seed TEXT NOT NULL,
                tickets_hash TEXT,
                winning_ticket_id INTEGER,
                winner_id INTEGER,
                drawn_at INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS lottery_tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lottery_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                purchased_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_lottery_tickets_lottery
            ON lottery_tickets(lottery_id, id);

            CREATE INDEX IF NOT EXISTS idx_lottery_tickets_user
            ON lottery_tickets(user_id, lottery_id);

            CREATE TABLE IF NOT EXISTS lottery_draw_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lottery_id INTEGER NOT NULL UNIQUE,
                total_tickets INTEGER NOT NULL,
                tickets_hash TEXT NOT NULL,
                seed_hash TEXT NOT NULL,
                revealed_seed TEXT NOT NULL,
                winning_ticket_id INTEGER,
                winner_id INTEGER,
                created_at INTEGER NOT NULL
            );
            """
        )


        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS live_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_key TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                subtitle TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                icon TEXT NOT NULL DEFAULT '⚡',
                event_type TEXT NOT NULL,
                starts_at INTEGER NOT NULL,
                ends_at INTEGER NOT NULL,
                multiplier REAL NOT NULL DEFAULT 1.0,
                reward_amount INTEGER NOT NULL DEFAULT 0,
                game_key TEXT,
                lottery_id INTEGER,
                active INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS live_event_claims (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                claimed_at INTEGER NOT NULL,
                reward INTEGER NOT NULL DEFAULT 0,
                UNIQUE(event_id, user_id)
            );
            """
        )

        if db.execute("SELECT COUNT(*) FROM live_events").fetchone()[0] == 0:
            now = int(time.time())
            events = [
                (
                    "boosted_rh_weekend",
                    "BOOSTED RH",
                    "Подвійні нагороди",
                    "Сьогодні активний boosted режим для мініігор.",
                    "⚡",
                    "boost",
                    now - 3600,
                    now + 2 * 86400,
                    2.0,
                    0,
                    None,
                    None,
                    1,
                    now,
                ),
                (
                    "game_of_day",
                    "GAME OF THE DAY",
                    "Reaction Test",
                    "Зіграй у гру дня та отримай додатковий бонус.",
                    "🎮",
                    "game",
                    now - 3600,
                    now + 86400,
                    1.0,
                    15,
                    "reaction",
                    None,
                    1,
                    now,
                ),
                (
                    "daily_drop",
                    "DAILY DROP",
                    "Подарунок дня",
                    "Забери безкоштовний RH-бонус, поки подія активна.",
                    "🎁",
                    "claim",
                    now - 3600,
                    now + 86400,
                    1.0,
                    25,
                    None,
                    None,
                    1,
                    now,
                ),
            ]
            db.executemany(
                """
                INSERT INTO live_events(
                    event_key,title,subtitle,description,icon,event_type,
                    starts_at,ends_at,multiplier,reward_amount,game_key,
                    lottery_id,active,created_at
                )
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                events,
            )


        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS daily_calendar_claims (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                day_key TEXT NOT NULL,
                cycle_day INTEGER NOT NULL,
                reward INTEGER NOT NULL,
                claimed_at INTEGER NOT NULL,
                UNIQUE(user_id, day_key)
            );

            CREATE TABLE IF NOT EXISTS mystery_drops (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                drop_key TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                reward INTEGER NOT NULL,
                starts_at INTEGER NOT NULL,
                ends_at INTEGER NOT NULL,
                active INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS mystery_drop_claims (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                drop_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                reward INTEGER NOT NULL,
                claimed_at INTEGER NOT NULL,
                UNIQUE(drop_id, user_id)
            );
            """
        )


        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS social_follows (
                follower_id INTEGER NOT NULL,
                followed_id INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                PRIMARY KEY(follower_id, followed_id)
            );
            CREATE TABLE IF NOT EXISTS social_activity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                kind TEXT NOT NULL,
                title TEXT NOT NULL,
                subtitle TEXT NOT NULL DEFAULT '',
                icon TEXT NOT NULL DEFAULT '✦',
                created_at INTEGER NOT NULL
            );
            """
        )


        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS cosmetics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cosmetic_key TEXT NOT NULL UNIQUE,
                cosmetic_type TEXT NOT NULL,
                title TEXT NOT NULL,
                subtitle TEXT NOT NULL DEFAULT '',
                rarity TEXT NOT NULL DEFAULT 'common',
                unlock_type TEXT NOT NULL DEFAULT 'free',
                unlock_value INTEGER NOT NULL DEFAULT 0,
                css_class TEXT NOT NULL,
                icon TEXT NOT NULL DEFAULT '✦',
                sort_order INTEGER NOT NULL DEFAULT 0,
                active INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS user_cosmetics (
                user_id INTEGER NOT NULL,
                cosmetic_key TEXT NOT NULL,
                unlocked_at INTEGER NOT NULL,
                PRIMARY KEY(user_id, cosmetic_key)
            );

            CREATE TABLE IF NOT EXISTS user_cosmetic_equips (
                user_id INTEGER NOT NULL,
                cosmetic_type TEXT NOT NULL,
                cosmetic_key TEXT,
                updated_at INTEGER NOT NULL,
                PRIMARY KEY(user_id, cosmetic_type)
            );
            """
        )

        if db.execute("SELECT COUNT(*) FROM cosmetics").fetchone()[0] == 0:
            cosmetics_seed = [
                ("frame_default","frame","Classic Frame","Стартова рамка","common","free",0,"rh28-frame-default","◇",1,1),
                ("frame_neon","frame","Neon Pulse","Фіолетове неонове кільце","rare","level",3,"rh28-frame-neon","✦",2,1),
                ("frame_gold","frame","Golden Crown","Золота преміум рамка","epic","level",7,"rh28-frame-gold","♛",3,1),
                ("frame_aurora","frame","Aurora Core","Анімована aurora рамка","legendary","level",12,"rh28-frame-aurora","◈",4,1),

                ("bg_night","background","Night Grid","Темний grid фон","common","free",0,"rh28-bg-night","▦",10,1),
                ("bg_neon","background","Neon Horizon","Неоновий premium фон","rare","level",4,"rh28-bg-neon","≈",11,1),
                ("bg_gold","background","Golden Vault","Золотий фон переможця","epic","wins",1,"rh28-bg-gold","✺",12,1),
                ("bg_cosmic","background","Cosmic Rift","Космічний легендарний фон","legendary","level",15,"rh28-bg-cosmic","✧",13,1),

                ("title_player","title","ReferHub Player","Стандартний титул","common","free",0,"rh28-title-player","R",20,1),
                ("title_arcade","title","Arcade Hunter","За активність у мінііграх","rare","games",25,"rh28-title-arcade","🎮",21,1),
                ("title_lucky","title","Lucky One","За першу перемогу","epic","wins",1,"rh28-title-lucky","🍀",22,1),
                ("title_veteran","title","ReferHub Veteran","За високий рівень","legendary","level",15,"rh28-title-veteran","⚔",23,1),

                ("effect_none","effect","No Effect","Без ефекту","common","free",0,"rh28-effect-none","·",30,1),
                ("effect_glow","effect","Soft Glow","М'яке світіння профілю","rare","level",5,"rh28-effect-glow","✦",31,1),
                ("effect_sparks","effect","Golden Sparks","Золоті частинки","epic","level",10,"rh28-effect-sparks","✺",32,1),
                ("effect_prism","effect","Prism Aura","Легендарна prism aura","legendary","level",18,"rh28-effect-prism","◈",33,1)
            ]
            db.executemany(
                """
                INSERT INTO cosmetics(
                    cosmetic_key,cosmetic_type,title,subtitle,rarity,unlock_type,
                    unlock_value,css_class,icon,sort_order,active
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
                """,
                cosmetics_seed
            )


        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS achievements_v32 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                achievement_key TEXT NOT NULL UNIQUE,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                icon TEXT NOT NULL DEFAULT '🏆',
                rarity TEXT NOT NULL DEFAULT 'common',
                metric TEXT NOT NULL,
                goal INTEGER NOT NULL,
                reward_rh INTEGER NOT NULL DEFAULT 0,
                hidden INTEGER NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0,
                active INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS achievement_claims_v32 (
                user_id INTEGER NOT NULL,
                achievement_key TEXT NOT NULL,
                claimed_at INTEGER NOT NULL,
                reward_rh INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY(user_id, achievement_key)
            );
            """
        )

        if db.execute("SELECT COUNT(*) FROM achievements_v32").fetchone()[0] == 0:
            seed = [
                ("games_10","games","Перші кроки","Зіграй 10 раундів у мінііграх","🎮","common","games_played",10,15,0,1,1),
                ("games_50","games","Аркадник","Зіграй 50 раундів","⚡","rare","games_played",50,35,0,2,1),
                ("games_150","games","Game Hunter","Зіграй 150 раундів","🕹️","epic","games_played",150,75,0,3,1),
                ("games_500","games","Arcade Legend","Зіграй 500 раундів","👾","legendary","games_played",500,150,1,4,1),

                ("earn_100","economy","RH Hunter","Зароби 100 RH у мінііграх","✦","common","game_earned",100,15,0,10,1),
                ("earn_1000","economy","RH Collector","Зароби 1000 RH у мінііграх","💎","epic","game_earned",1000,80,0,11,1),
                ("earn_5000","economy","Vault Breaker","Зароби 5000 RH за весь час","🏦","legendary","total_earned",5000,200,1,12,1),

                ("tickets_10","lottery","Перші шанси","Отримай 10 білетів","🎟️","common","tickets",10,15,0,20,1),
                ("tickets_100","lottery","Ticket Master","Отримай 100 білетів","🎫","rare","tickets",100,40,0,21,1),
                ("lottery_win","lottery","Lucky One","Виграй перший розіграш","👑","epic","lottery_wins",1,100,0,22,1),
                ("lottery_wins_5","lottery","Fortune King","Виграй 5 розіграшів","🍀","legendary","lottery_wins",5,250,1,23,1),

                ("friends_3","social","Перші друзі","Запроси або додай 3 друзів","👥","common","friends",3,20,0,30,1),
                ("friends_10","social","Community Builder","Збери 10 друзів","🤝","rare","friends",10,50,0,31,1),
                ("friends_25","social","ReferHub Star","Збери 25 друзів","🌐","epic","friends",25,100,0,32,1),

                ("streak_3","daily","На зв'язку","Утримуй streak 3 дні","🔥","common","streak",3,15,0,40,1),
                ("streak_7","daily","Тиждень сили","Утримуй streak 7 днів","🔥","rare","streak",7,40,0,41,1),
                ("streak_30","daily","Без пропусків","Утримуй streak 30 днів","☀️","legendary","streak",30,200,1,42,1)
            ]
            db.executemany(
                """
                INSERT INTO achievements_v32(
                    achievement_key,category,title,description,icon,rarity,
                    metric,goal,reward_rh,hidden,sort_order,active
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                seed
            )


        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS arcade_challenge_claims_v34 (
                user_id INTEGER NOT NULL,
                day_key TEXT NOT NULL,
                challenge_key TEXT NOT NULL,
                claimed_at INTEGER NOT NULL,
                reward_rh INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY(user_id, day_key, challenge_key)
            );
            """
        )


        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS activity_feed_v37 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                kind TEXT NOT NULL,
                title TEXT NOT NULL,
                detail TEXT NOT NULL DEFAULT '',
                icon TEXT NOT NULL DEFAULT '✦',
                value INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_activity_feed_v37_created
            ON activity_feed_v37(created_at DESC);
            """
        )


        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS tournaments_v38 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tournament_key TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                subtitle TEXT NOT NULL DEFAULT '',
                game_key TEXT NOT NULL,
                icon TEXT NOT NULL DEFAULT '🏆',
                starts_at INTEGER NOT NULL,
                ends_at INTEGER NOT NULL,
                prize_1 INTEGER NOT NULL DEFAULT 100,
                prize_2 INTEGER NOT NULL DEFAULT 50,
                prize_3 INTEGER NOT NULL DEFAULT 25,
                active INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tournament_claims_v38 (
                tournament_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                place INTEGER NOT NULL,
                reward_rh INTEGER NOT NULL,
                claimed_at INTEGER NOT NULL,
                PRIMARY KEY(tournament_id,user_id)
            );
            """
        )

        if db.execute("SELECT COUNT(*) FROM tournaments_v38").fetchone()[0] == 0:
            now=int(time.time())
            seed=[
                ("reaction_week","Reaction Sprint","Найшвидші реакції тижня","reaction","⚡",now-3600,now+3*86400,150,75,35,1,now),
                ("dice_cup","Dice Cup","Хто набере більше RH у Dice Duel","dice_duel","🎲",now-3600,now+5*86400,200,100,50,1,now),
                ("arcade_mix","Arcade Masters","Загальний турнір за заробленими RH","all","🏆",now-3600,now+7*86400,300,150,75,1,now)
            ]
            db.executemany(
                """
                INSERT INTO tournaments_v38(
                    tournament_key,title,subtitle,game_key,icon,starts_at,ends_at,
                    prize_1,prize_2,prize_3,active,created_at
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                seed
            )

        user_columns = {
            row["name"]
            for row in db.execute("PRAGMA table_info(users)").fetchall()
        }
        user_migrations = [
            ("is_banned", "ALTER TABLE users ADD COLUMN is_banned INTEGER NOT NULL DEFAULT 0"),
            ("xp", "ALTER TABLE users ADD COLUMN xp INTEGER NOT NULL DEFAULT 0"),
            ("photo_url", "ALTER TABLE users ADD COLUMN photo_url TEXT"),
            ("profile_frame", "ALTER TABLE users ADD COLUMN profile_frame TEXT NOT NULL DEFAULT 'violet'"),
            ("featured_achievement_id", "ALTER TABLE users ADD COLUMN featured_achievement_id INTEGER"),
            ("stars", "ALTER TABLE users ADD COLUMN stars INTEGER NOT NULL DEFAULT 0"),
        ]
        for column_name, statement in user_migrations:
            if column_name not in user_columns:
                db.execute(statement)

        tournament_columns = {
            row["name"]
            for row in db.execute("PRAGMA table_info(tournaments)").fetchall()
        }
        tournament_migrations = [
            ("is_finalized", "ALTER TABLE tournaments ADD COLUMN is_finalized INTEGER NOT NULL DEFAULT 0"),
            ("is_cancelled", "ALTER TABLE tournaments ADD COLUMN is_cancelled INTEGER NOT NULL DEFAULT 0"),
            ("finalized_at", "ALTER TABLE tournaments ADD COLUMN finalized_at INTEGER NOT NULL DEFAULT 0"),
            ("cancelled_at", "ALTER TABLE tournaments ADD COLUMN cancelled_at INTEGER NOT NULL DEFAULT 0"),
        ]
        for column_name, statement in tournament_migrations:
            if column_name not in tournament_columns:
                db.execute(statement)

        gift_columns = {
            row["name"]
            for row in db.execute("PRAGMA table_info(gifts)").fetchall()
        }
        gift_migrations = [
            ("description", "ALTER TABLE gifts ADD COLUMN description TEXT NOT NULL DEFAULT ''"),
            ("stock", "ALTER TABLE gifts ADD COLUMN stock INTEGER NOT NULL DEFAULT 0"),
            ("is_active", "ALTER TABLE gifts ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1"),
            ("sort_order", "ALTER TABLE gifts ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0"),
            ("created_at", "ALTER TABLE gifts ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0"),
            ("category", "ALTER TABLE gifts ADD COLUMN category TEXT NOT NULL DEFAULT 'Telegram Gifts'"),
            ("image_url", "ALTER TABLE gifts ADD COLUMN image_url TEXT"),
            ("old_price", "ALTER TABLE gifts ADD COLUMN old_price INTEGER NOT NULL DEFAULT 0"),
            ("is_featured", "ALTER TABLE gifts ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0"),
        ]
        for column_name, statement in gift_migrations:
            if column_name not in gift_columns:
                db.execute(statement)

        order_columns = {
            row["name"]
            for row in db.execute("PRAGMA table_info(gift_orders)").fetchall()
        }
        order_migrations = [
            ("admin_note", "ALTER TABLE gift_orders ADD COLUMN admin_note TEXT"),
            ("updated_at", "ALTER TABLE gift_orders ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0"),
            ("original_price", "ALTER TABLE gift_orders ADD COLUMN original_price INTEGER NOT NULL DEFAULT 0"),
            ("promo_code", "ALTER TABLE gift_orders ADD COLUMN promo_code TEXT"),
        ]
        for column_name, statement in order_migrations:
            if column_name not in order_columns:
                db.execute(statement)

        task_columns = {
            row["name"]
            for row in db.execute("PRAGMA table_info(tasks)").fetchall()
        }
        migrations = [
            ("category", "ALTER TABLE tasks ADD COLUMN category TEXT NOT NULL DEFAULT 'other'"),
            ("verification_type", "ALTER TABLE tasks ADD COLUMN verification_type TEXT NOT NULL DEFAULT 'visit'"),
            ("telegram_chat_id", "ALTER TABLE tasks ADD COLUMN telegram_chat_id TEXT"),
            ("wait_seconds", "ALTER TABLE tasks ADD COLUMN wait_seconds INTEGER NOT NULL DEFAULT 5"),
            ("sort_order", "ALTER TABLE tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0"),
            ("created_at", "ALTER TABLE tasks ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0"),
            ("xp_reward", "ALTER TABLE tasks ADD COLUMN xp_reward INTEGER NOT NULL DEFAULT 5"),
            ("max_claims", "ALTER TABLE tasks ADD COLUMN max_claims INTEGER NOT NULL DEFAULT 0"),
            ("starts_at", "ALTER TABLE tasks ADD COLUMN starts_at INTEGER NOT NULL DEFAULT 0"),
            ("ends_at", "ALTER TABLE tasks ADD COLUMN ends_at INTEGER NOT NULL DEFAULT 0"),
        ]
        for column_name, statement in migrations:
            if column_name not in task_columns:
                db.execute(statement)

        if db.execute("SELECT COUNT(*) FROM game_settings").fetchone()[0] == 0:
            db.executemany(
                """
                INSERT INTO game_settings(
                    game_key, is_active, min_bet, max_bet,
                    daily_limit, cooldown_seconds, config_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        "roulette",
                        1,
                        0,
                        0,
                        1,
                        86400,
                        json.dumps({
                            "rewards": [0, 1, 2, 3, 5, 10, 20],
                            "weights": [28, 24, 18, 13, 9, 6, 2],
                        }),
                    ),
                    (
                        "slot",
                        1,
                        5,
                        100,
                        20,
                        15,
                        json.dumps({
                            "symbols": ["🍒", "🍋", "🔔", "⭐", "💎"],
                            "win_chance": 0.24,
                            "double_multiplier": 1.2,
                            "triple_multipliers": {
                                "🍒": 2,
                                "🍋": 2.5,
                                "🔔": 4,
                                "⭐": 6,
                                "💎": 10
                            },
                        }),
                    ),
                    (
                        "daily_case",
                        1,
                        0,
                        0,
                        1,
                        86400,
                        json.dumps({
                            "rewards": [1, 2, 3, 5, 10, 25],
                            "weights": [30, 25, 20, 14, 8, 3],
                        }),
                    ),
                    (
                        "coin_flip",
                        1,
                        5,
                        50,
                        10,
                        30,
                        json.dumps({
                            "win_chance": 0.46,
                            "multiplier": 1.85
                        }),
                    ),
                    (
                        "number_guess",
                        1,
                        0,
                        0,
                        5,
                        3600,
                        json.dumps({
                            "min_number": 1,
                            "max_number": 5,
                            "reward": 8
                        }),
                    ),
                    (
                        "scratch",
                        1,
                        0,
                        0,
                        1,
                        86400,
                        json.dumps({
                            "rewards": [0, 1, 2, 3, 5, 10, 20],
                            "weights": [24, 26, 20, 14, 9, 5, 2]
                        }),
                    ),
                    (
                        "safe_crack",
                        1,
                        0,
                        0,
                        3,
                        21600,
                        json.dumps({
                            "reward": 12,
                            "range": 6
                        }),
                    ),
                ],
            )

        if db.execute("SELECT COUNT(*) FROM seasons").fetchone()[0] == 0:
            now = int(time.time())
            cursor = db.execute(
                """
                INSERT INTO seasons(
                    title, description, starts_at, ends_at,
                    max_level, xp_per_level, is_active
                )
                VALUES (?, ?, ?, ?, 20, 100, 1)
                """,
                (
                    "NEON ASCENSION",
                    "Перший сезон ReferHub. Виконуй місії та відкривай нагороди.",
                    now - 3600,
                    now + 30 * 86400,
                ),
            )
            season_id = cursor.lastrowid

            rewards = []
            for level in range(1, 21):
                if level % 5 == 0:
                    value = level * 5
                    icon = "👑" if level == 20 else "💎"
                    title = f"Елітна нагорода {level}"
                else:
                    value = 5 + level * 2
                    icon = "⭐"
                    title = f"Нагорода рівня {level}"
                rewards.append(
                    (season_id, level, "rh", value, title, icon)
                )

            db.executemany(
                """
                INSERT INTO season_rewards(
                    season_id, level, reward_type,
                    reward_value, title, icon
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                rewards,
            )

            db.executemany(
                """
                INSERT INTO season_missions(
                    season_id, title, description,
                    mission_type, target_value,
                    season_xp_reward
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        season_id,
                        "Мисливець за завданнями",
                        "Виконай 10 завдань протягом сезону",
                        "tasks",
                        10,
                        180,
                    ),
                    (
                        season_id,
                        "Аркадний боєць",
                        "Зіграй 25 разів у будь-які ігри",
                        "games",
                        25,
                        220,
                    ),
                    (
                        season_id,
                        "Колекціонер RH",
                        "Зароби 300 RH протягом сезону",
                        "earned",
                        300,
                        300,
                    ),
                    (
                        season_id,
                        "Соціальний рівень",
                        "Запроси 3 друзів",
                        "friends",
                        3,
                        260,
                    ),
                ],
            )

        if db.execute("SELECT COUNT(*) FROM achievements").fetchone()[0] == 0:
            db.executemany(
                """
                INSERT INTO achievements(
                    code, title, description, icon,
                    condition_type, condition_value,
                    reward, xp_reward
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    ("earn_100", "Перші 100 RH", "Зароби 100 RH ⭐", "💰", "earned", 100, 10, 25),
                    ("tasks_10", "Працьовитий", "Виконай 10 завдань", "📋", "tasks", 10, 20, 40),
                    ("friends_5", "Команда", "Запроси 5 друзів", "👥", "friends", 5, 25, 50),
                    ("level_5", "Майстер", "Досягни 5 рівня", "👑", "level", 5, 50, 100),
                ],
            )

        if db.execute("SELECT COUNT(*) FROM daily_missions").fetchone()[0] == 0:
            db.executemany(
                """
                INSERT INTO daily_missions(
                    title, description, mission_type,
                    target_value, reward, xp_reward
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [
                    ("Виконай завдання", "Виконай 1 завдання сьогодні", "tasks", 1, 5, 10),
                    ("Зіграй 3 рази", "Зіграй 3 рази у будь-яку гру", "games", 3, 8, 15),
                    ("Зароби 20 RH", "Зароби 20 RH ⭐ за день", "earned", 20, 10, 20),
                ],
            )

        if db.execute("SELECT COUNT(*) FROM tournaments").fetchone()[0] == 0:
            now = int(time.time())
            db.execute(
                """
                INSERT INTO tournaments(
                    title, description, starts_at, ends_at,
                    prize_1, prize_2, prize_3
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "Тижневий турнір",
                    "Зароби найбільше RH ⭐ за тиждень",
                    now - 3600,
                    now + 7 * 86400,
                    100,
                    50,
                    25,
                ),
            )

        extra_games = [
            (
                "coin_flip", 1, 5, 50, 10, 30,
                json.dumps({"win_chance": 0.46, "multiplier": 1.85}),
            ),
            (
                "number_guess", 1, 0, 0, 5, 3600,
                json.dumps({"min_number": 1, "max_number": 5, "reward": 8}),
            ),
            (
                "scratch", 1, 0, 0, 1, 86400,
                json.dumps({
                    "rewards": [0, 1, 2, 3, 5, 10, 20],
                    "weights": [24, 26, 20, 14, 9, 5, 2],
                }),
            ),
            (
                "safe_crack", 1, 0, 0, 3, 21600,
                json.dumps({"reward": 12, "range": 6}),
            ),
            (
                "dice_duel", 1, 0, 0, 10, 20,
                json.dumps({"reward": 4}),
            ),
            (
                "rps", 1, 0, 0, 15, 10,
                json.dumps({"win_reward": 5, "draw_reward": 2}),
            ),
            (
                "treasure_grid", 1, 0, 0, 3, 3600,
                json.dumps({"reward": 15, "cells": 9}),
            ),
            (
                "reaction", 1, 0, 0, 10, 15,
                json.dumps({
                    "great_ms": 260,
                    "good_ms": 380,
                    "great_reward": 10,
                    "good_reward": 6,
                    "base_reward": 3
                }),
            ),
        ]
        for game in extra_games:
            db.execute(
                """
                INSERT OR IGNORE INTO game_settings(
                    game_key, is_active, min_bet, max_bet,
                    daily_limit, cooldown_seconds, config_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                game,
            )

        db.execute(
            """
            UPDATE game_settings
            SET daily_limit = CASE WHEN daily_limit = 0 THEN 20 ELSE daily_limit END,
                cooldown_seconds = CASE WHEN cooldown_seconds < 15 THEN 15 ELSE cooldown_seconds END
            WHERE game_key = 'slot'
            """
        )

        if db.execute("SELECT COUNT(*) FROM tasks").fetchone()[0] == 0:
            now = int(time.time())
            db.executemany(
                """
                INSERT INTO tasks(
                    title, description, reward, icon, link,
                    category, verification_type, wait_seconds,
                    sort_order, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        "Перша нагорода",
                        "Відкрий завдання, зачекай кілька секунд і забери бонус.",
                        5,
                        "🚀",
                        None,
                        "other",
                        "instant",
                        0,
                        30,
                        now,
                    ),
                    (
                        "Запроси друга",
                        "Поділись реферальним посиланням. Нагорода доступна після першого реферала.",
                        15,
                        "👥",
                        None,
                        "referral",
                        "referral",
                        0,
                        20,
                        now,
                    ),
                    (
                        "Відкрий Telegram",
                        "Перейди за посиланням і повернися для перевірки.",
                        3,
                        "📢",
                        "https://t.me/telegram",
                        "telegram",
                        "visit",
                        5,
                        10,
                        now,
                    ),
                ],
            )

        if db.execute("SELECT COUNT(*) FROM gifts").fetchone()[0] == 0:
            db.executemany(
                """
                INSERT INTO gifts(title, emoji, price)
                VALUES (?, ?, ?)
                """,
                [
                    ("Маленький подарунок", "🎁", 100),
                    ("Середній подарунок", "💎", 250),
                    ("Преміум-подарунок", "👑", 500),
                ],
            )



        # ReferHub Lottery v1: create the first transparent draw on a fresh database.
        if db.execute("SELECT COUNT(*) FROM lotteries").fetchone()[0] == 0:
            now = int(time.time())
            secret_seed = secrets.token_hex(32)
            seed_hash = hashlib.sha256(secret_seed.encode()).hexdigest()
            db.execute(
                """
                INSERT INTO lotteries(
                    title, description, prize_name, prize_emoji,
                    ticket_price, starts_at, ends_at, status,
                    seed_hash, secret_seed, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
                """,
                (
                    "Перший розіграш ReferHub",
                    "Заробляй RH у мінііграх та завданнях і обмінюй їх на квитки.",
                    "Перший приз ReferHub",
                    "🎁",
                    100,
                    now - 60,
                    now + 3 * 86400,
                    seed_hash,
                    secret_seed,
                    now,
                ),
            )

        # Beta 9.6: the visual wheel has 12 sectors:
        # 1,2,3,4,5,5,6,7,8,9,10 and a star jackpot (15).
        db.execute(
            """
            UPDATE game_settings
            SET min_bet = 0,
                max_bet = 0,
                config_json = ?
            WHERE game_key = 'roulette'
            """,
            (
                json.dumps({
                    "rewards": [1, 2, 3, 4, 5, 5, 6, 7, 8, 9, 10, 15],
                    "weights": [11, 10, 10, 9, 10, 8, 8, 8, 7, 7, 6, 6],
                    "currency": "stars",
                    "jackpot_value": 15,
                }),
            ),
        )

        db.commit()


def add_balance(db, user_id: int, amount: int, note: str, xp: int = 0):
    now = int(time.time())
    db.execute(
        """
        UPDATE users
        SET balance = balance + ?,
            total_earned = total_earned + CASE WHEN ? > 0 THEN ? ELSE 0 END,
            xp = xp + ?,
            last_seen = ?
        WHERE telegram_id = ?
        """,
        (amount, amount, amount, xp, now, user_id),
    )
    db.execute(
        """
        INSERT INTO ledger(user_id, amount, note, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (user_id, amount, note, now),
    )


def upsert_user(user: dict, referrer_id: int | None = None):
    user_id = int(user["id"])
    now = int(time.time())

    with connect_db() as db:
        existing = db.execute(
            "SELECT * FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()

        if existing:
            db.execute(
                """
                UPDATE users
                SET username = ?, first_name = ?, photo_url = ?, last_seen = ?
                WHERE telegram_id = ?
                """,
                (
                    user.get("username"),
                    user.get("first_name") or "Користувач",
                    user.get("photo_url"),
                    now,
                    user_id,
                ),
            )
            db.commit()
            return

        if referrer_id == user_id:
            referrer_id = None

        if referrer_id:
            found = db.execute(
                "SELECT telegram_id FROM users WHERE telegram_id = ?",
                (referrer_id,),
            ).fetchone()
            if not found:
                referrer_id = None

        db.execute(
            """
            INSERT INTO users(
                telegram_id, username, first_name, photo_url,
                referrer_id, created_at, last_seen
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                user.get("username"),
                user.get("first_name") or "Користувач",
                user.get("photo_url"),
                referrer_id,
                now,
                now,
            ),
        )

        if referrer_id:
            db.execute(
                """
                UPDATE users
                SET referrals_count = referrals_count + 1
                WHERE telegram_id = ?
                """,
                (referrer_id,),
            )
            try:
                db.execute(
                    """
                    INSERT INTO referral_rewards(
                        referrer_id, referral_id, amount,
                        reward_type, created_at
                    )
                    VALUES (?, ?, ?, 'signup', ?)
                    """,
                    (
                        referrer_id,
                        user_id,
                        REFERRAL_REWARD,
                        now,
                    ),
                )
                add_balance(
                    db,
                    referrer_id,
                    REFERRAL_REWARD,
                    f"Новий реферал #{user_id}",
                )
                add_season_progress(db, referrer_id, "friends", 1)
            except sqlite3.IntegrityError:
                pass

        db.commit()


def validate_init_data(init_data: str) -> dict:
    if not init_data:
        if DEBUG_USER_ID:
            return {
                "id": DEBUG_USER_ID,
                "first_name": "Eduard",
                "username": "debug_user",
            }
        raise HTTPException(401, "Відкрий застосунок через Telegram або додай DEBUG_USER_ID")

    token = runtime_bot_token()
    if not token:
        raise HTTPException(500, "BOT_TOKEN не налаштований")

    values = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = values.pop("hash", "")

    # Telegram Mini App BOT_TOKEN validation:
    # exclude only `hash`; keep `signature` inside data-check-string.
    check_string = "\n".join(
        f"{key}={value}"
        for key, value in sorted(values.items())
    )

    secret = hmac.new(
        b"WebAppData",
        token.encode(),
        hashlib.sha256,
    ).digest()

    calculated = hmac.new(
        secret,
        check_string.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(calculated, received_hash):
        raise HTTPException(401, "Невірний підпис Telegram")

    try:
        return json.loads(values["user"])
    except Exception as exc:
        raise HTTPException(401, "Telegram не передав користувача") from exc


def current_user(init_data: str | None):
    user = validate_init_data(init_data or "")
    upsert_user(user)

    with connect_db() as db:
        row = db.execute(
            "SELECT is_banned FROM users WHERE telegram_id = ?",
            (int(user["id"]),),
        ).fetchone()
        if row and row["is_banned"]:
            raise HTTPException(403, "Обліковий запис заблоковано")

    return user


def get_profile(user_id: int):
    with connect_db() as db:
        row = db.execute(
            "SELECT * FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()

        rank = db.execute(
            """
            SELECT COUNT(*) + 1
            FROM users
            WHERE total_earned > ?
            """,
            (row["total_earned"],),
        ).fetchone()[0]

        last_spin = db.execute(
            """
            SELECT created_at FROM spins
            WHERE user_id = ?
            ORDER BY id DESC LIMIT 1
            """,
            (user_id,),
        ).fetchone()

        next_spin = 0
        if last_spin:
            next_spin = max(0, last_spin["created_at"] + 86400 - int(time.time()))

        online_count = db.execute(
            """
            SELECT COUNT(*) FROM users
            WHERE last_seen >= ?
            """,
            (int(time.time()) - 300,),
        ).fetchone()[0]

        level = level_info(row["xp"])
        daily = get_daily_status(user_id)

        return {
            "id": row["telegram_id"],
            "username": row["username"],
            "first_name": row["first_name"],
            "photo_url": row["photo_url"],
            "profile_frame": row["profile_frame"],
            "featured_achievement_id": row["featured_achievement_id"],
            "balance": row["balance"],
            "stars": row["stars"],
            "total_earned": row["total_earned"],
            "xp": row["xp"],
            "referrals_count": row["referrals_count"],
            "rank": rank,
            "next_spin_in": next_spin,
            "is_admin": row["telegram_id"] in ADMIN_IDS,
            "referral_link": f"https://t.me/{BOT_USERNAME}?start=ref_{row['telegram_id']}",
            "online_count": online_count,
            "level": level,
            "daily": daily,
        }


def level_info(total_earned: int):
    levels = [
        ("Новачок", 0, 50, "🥉"),
        ("Шукач", 50, 150, "🥈"),
        ("Мисливець", 150, 350, "🥇"),
        ("Майстер", 350, 700, "💎"),
        ("Легенда", 700, 10**9, "👑"),
    ]

    for index, (name, start, end, icon) in enumerate(levels, start=1):
        if total_earned < end:
            progress = 100 if end >= 10**9 else int(
                max(0, min(100, (total_earned - start) / (end - start) * 100))
            )
            return {
                "number": index,
                "name": name,
                "icon": icon,
                "start": start,
                "next": None if end >= 10**9 else end,
                "progress": progress,
            }

    return {
        "number": len(levels),
        "name": "Легенда",
        "icon": "👑",
        "start": 700,
        "next": None,
        "progress": 100,
    }


def get_daily_status(user_id: int):
    now = int(time.time())
    with connect_db() as db:
        last = db.execute(
            """
            SELECT reward, streak, claimed_at
            FROM daily_claims
            WHERE user_id = ?
            ORDER BY id DESC LIMIT 1
            """,
            (user_id,),
        ).fetchone()

    if not last:
        return {
            "available": True,
            "streak": 0,
            "next_in": 0,
            "last_reward": 0,
        }

    remaining = last["claimed_at"] + 86400 - now
    return {
        "available": remaining <= 0,
        "streak": last["streak"],
        "next_in": max(0, remaining),
        "last_reward": last["reward"],
    }


TASK_CATEGORIES = {
    "telegram": "Telegram",
    "youtube": "YouTube",
    "tiktok": "TikTok",
    "instagram": "Instagram",
    "discord": "Discord",
    "referral": "Реферали",
    "other": "Інше",
}



class LotteryTicketPurchasePayload(BaseModel):
    count: int = Field(ge=1, le=500)


class LotteryCreatePayload(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=600)
    prize_name: str = Field(min_length=2, max_length=160)
    prize_emoji: str = Field(default="🎁", max_length=12)
    ticket_price: int = Field(ge=1, le=1000000)
    starts_at: int = Field(ge=0)
    ends_at: int = Field(ge=1)


class GamePlayPayload(BaseModel):
    bet: int = Field(default=0, ge=0, le=1000000)


class CoinFlipPayload(BaseModel):
    bet: int = Field(ge=1, le=1000000)
    choice: str


class NumberGuessPayload(BaseModel):
    number: int = Field(ge=1, le=100)


class SafeCrackPayload(BaseModel):
    number: int = Field(ge=1, le=100)


class SimpleChoicePayload(BaseModel):
    choice: str = Field(min_length=2, max_length=20)


class TreasureGridPayload(BaseModel):
    cell: int = Field(ge=1, le=9)


class ReactionFinishPayload(BaseModel):
    token: str = Field(min_length=16, max_length=128)


class GameSettingsPayload(BaseModel):
    is_active: bool | None = None
    min_bet: int | None = Field(default=None, ge=0, le=1000000)
    max_bet: int | None = Field(default=None, ge=0, le=1000000)
    daily_limit: int | None = Field(default=None, ge=0, le=100000)
    cooldown_seconds: int | None = Field(default=None, ge=0, le=31536000)
    config_json: str | None = None




class BalanceChangePayload(BaseModel):
    amount: int = Field(ge=-10000000, le=10000000)
    note: str = Field(default="Корекція адміністратором", max_length=300)


class UserBanPayload(BaseModel):
    is_banned: bool


class ProfileStylePayload(BaseModel):
    frame: str | None = None
    featured_achievement_id: int | None = None


class XPChangePayload(BaseModel):
    amount: int = Field(ge=-10000000, le=10000000)
    note: str = Field(default="Корекція XP адміністратором", max_length=300)


class SetLevelPayload(BaseModel):
    level: int = Field(ge=1, le=100000)
    note: str = Field(default="Рівень встановлено адміністратором", max_length=300)


class GrantAchievementPayload(BaseModel):
    achievement_id: int = Field(ge=1)
    claim_reward: bool = True




class GiftCreatePayload(BaseModel):
    title: str = Field(min_length=2, max_length=100)
    description: str = Field(default="", max_length=500)
    price: int = Field(ge=1, le=10000000)
    emoji: str = Field(default="🎁", max_length=10)
    stock: int = Field(default=0, ge=0, le=1000000)
    sort_order: int = Field(default=0, ge=-100000, le=100000)


class GiftUpdatePayload(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    price: int | None = Field(default=None, ge=1, le=10000000)
    emoji: str | None = Field(default=None, max_length=10)
    stock: int | None = Field(default=None, ge=0, le=1000000)
    sort_order: int | None = Field(default=None, ge=-100000, le=100000)
    is_active: bool | None = None


class OrderStatusPayload(BaseModel):
    status: str
    admin_note: str | None = Field(default=None, max_length=500)
    notify_user: bool = True



class TaskCreatePayload(BaseModel):
    title: str = Field(min_length=2, max_length=90)
    description: str = Field(min_length=2, max_length=400)
    reward: int = Field(ge=0, le=100000)
    icon: str = Field(default="⭐", max_length=10)
    link: str | None = Field(default=None, max_length=500)
    category: str = Field(default="other", max_length=30)
    verification_type: str = Field(default="visit", max_length=30)
    telegram_chat_id: str | None = Field(default=None, max_length=100)
    wait_seconds: int = Field(default=5, ge=0, le=3600)
    sort_order: int = Field(default=0, ge=-100000, le=100000)
    max_claims: int = Field(default=0, ge=0, le=10000000)
    starts_at: int = Field(default=0, ge=0)
    ends_at: int = Field(default=0, ge=0)


class TaskUpdatePayload(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=90)
    description: str | None = Field(default=None, min_length=2, max_length=400)
    reward: int | None = Field(default=None, ge=0, le=100000)
    icon: str | None = Field(default=None, max_length=10)
    link: str | None = Field(default=None, max_length=500)
    category: str | None = Field(default=None, max_length=30)
    verification_type: str | None = Field(default=None, max_length=30)
    telegram_chat_id: str | None = Field(default=None, max_length=100)
    wait_seconds: int | None = Field(default=None, ge=0, le=3600)
    sort_order: int | None = Field(default=None, ge=-100000, le=100000)
    max_claims: int | None = Field(default=None, ge=0, le=10000000)
    starts_at: int | None = Field(default=None, ge=0)
    ends_at: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


def require_admin(user_id: int):
    if user_id not in ADMIN_IDS:
        raise HTTPException(403, "Немає доступу")


def normalize_telegram_chat_id(chat_id: str) -> str | int:
    value = (chat_id or "").strip()
    if not value:
        raise ValueError("Telegram-канал не вказаний")

    if value.startswith("https://t.me/"):
        value = "@" + value.rstrip("/").split("/")[-1]
    elif value.startswith("t.me/"):
        value = "@" + value.rstrip("/").split("/")[-1]

    if value.lstrip("-").isdigit():
        return int(value)

    if not value.startswith("@"):
        value = "@" + value

    return value


async def telegram_membership_details(user_id: int, chat_id: str):
    if not bot_app:
        return False, "Telegram-бот не запущений. Перевір BOT_TOKEN."

    try:
        normalized = normalize_telegram_chat_id(chat_id)
        member = await bot_app.bot.get_chat_member(
            chat_id=normalized,
            user_id=user_id,
        )

        status = member.status
        is_member = status in {"member", "administrator", "creator"}
        if status == "restricted":
            is_member = bool(getattr(member, "is_member", False))

        if is_member:
            return True, None

        if status in {"left", "kicked"}:
            return False, "Користувач не підписаний на канал"

        return False, f"Підписку не підтверджено: статус {status}"
    except ValueError as error:
        return False, str(error)
    except Exception as error:
        message = str(error).lower()

        if "chat not found" in message:
            return False, "Канал не знайдено. Перевір @username або chat_id."
        if "member list is inaccessible" in message or "not enough rights" in message:
            return False, "Бота треба додати адміністратором каналу."
        if "user not found" in message:
            return False, "Користувача не знайдено в Telegram."

        return False, f"Помилка Telegram: {str(error)[:160]}"


async def verify_telegram_membership(user_id: int, chat_id: str) -> bool:
    ok, _ = await telegram_membership_details(user_id, chat_id)
    return ok



def task_availability(db, task):
    now = int(time.time())

    if not task["is_active"]:
        return False, "Завдання вимкнено"

    if task["starts_at"] and now < task["starts_at"]:
        return False, "Завдання ще не почалося"

    if task["ends_at"] and now > task["ends_at"]:
        return False, "Термін завдання завершився"

    if task["max_claims"]:
        claims_count = db.execute(
            "SELECT COUNT(*) FROM task_claims WHERE task_id = ?",
            (task["id"],),
        ).fetchone()[0]
        if claims_count >= task["max_claims"]:
            return False, "Ліміт виконань вичерпано"

    return True, None


async def verify_task_completion(db, task, user_id: int):
    verification_type = task["verification_type"]

    if verification_type == "instant":
        return True, None

    if verification_type == "referral":
        referrals = db.execute(
            "SELECT referrals_count FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()
        if referrals and referrals["referrals_count"] >= 1:
            return True, None
        return False, "Запроси хоча б одного друга"

    if verification_type == "telegram_member":
        chat_id = task["telegram_chat_id"]
        if not chat_id:
            return False, "Адміністратор не вказав Telegram-канал"
        verified, reason = await telegram_membership_details(user_id, chat_id)
        if verified:
            return True, None
        return False, reason or "Підписку на канал не знайдено"

    opened = db.execute(
        """
        SELECT opened_at FROM task_opens
        WHERE task_id = ? AND user_id = ?
        """,
        (task["id"], user_id),
    ).fetchone()

    if not opened:
        return False, "Спочатку натисни «Відкрити»"

    remaining = opened["opened_at"] + task["wait_seconds"] - int(time.time())
    if remaining > 0:
        return False, f"Зачекай ще {remaining} сек."

    return True, None


def get_game_setting(db, game_key: str):
    row = db.execute(
        "SELECT * FROM game_settings WHERE game_key = ?",
        (game_key,),
    ).fetchone()
    if not row:
        raise HTTPException(404, "Гру не знайдено")
    return row


def weighted_choice(values, weights):
    import random
    return random.choices(values, weights=weights, k=1)[0]


def game_access_check(db, user_id: int, setting):
    if not setting["is_active"]:
        raise HTTPException(400, "Гру тимчасово вимкнено")

    now = int(time.time())
    today_start = now - (now % 86400)

    if setting["daily_limit"]:
        count = db.execute(
            """
            SELECT COUNT(*) FROM game_plays
            WHERE user_id = ? AND game_key = ? AND created_at >= ?
            """,
            (user_id, setting["game_key"], today_start),
        ).fetchone()[0]
        if count >= setting["daily_limit"]:
            raise HTTPException(400, "Денний ліміт спроб вичерпано")

    if setting["cooldown_seconds"]:
        last = db.execute(
            """
            SELECT created_at FROM game_plays
            WHERE user_id = ? AND game_key = ?
            ORDER BY id DESC LIMIT 1
            """,
            (user_id, setting["game_key"]),
        ).fetchone()
        if last:
            remaining = (
                last["created_at"]
                + setting["cooldown_seconds"]
                - now
            )
            if remaining > 0:
                raise HTTPException(
                    400,
                    f"Наступна спроба через {remaining} сек.",
                )


def save_game_play(
    db,
    user_id: int,
    game_key: str,
    bet: int,
    reward: int,
    result_text: str,
):
    db.execute(
        """
        INSERT INTO game_plays(
            user_id, game_key, bet, reward,
            result_text, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            game_key,
            bet,
            reward,
            result_text,
            int(time.time()),
        ),
    )





def lottery_public_row(db, lottery, user_id: int | None = None):
    lottery_id = int(lottery["id"])
    total_tickets = db.execute(
        "SELECT COUNT(*) FROM lottery_tickets WHERE lottery_id = ?",
        (lottery_id,),
    ).fetchone()[0]

    my_tickets = 0
    if user_id is not None:
        my_tickets = db.execute(
            """
            SELECT COUNT(*) FROM lottery_tickets
            WHERE lottery_id = ? AND user_id = ?
            """,
            (lottery_id, user_id),
        ).fetchone()[0]

    chance = (my_tickets / total_tickets * 100.0) if total_tickets else 0.0

    winner_username = None
    winner_first_name = None
    if lottery["winner_id"]:
        winner = db.execute(
            "SELECT username, first_name FROM users WHERE telegram_id = ?",
            (int(lottery["winner_id"]),),
        ).fetchone()
        if winner:
            winner_username = winner["username"]
            winner_first_name = winner["first_name"]

    now = int(time.time())
    effective_status = lottery["status"]
    if effective_status == "active":
        if now < int(lottery["starts_at"]):
            effective_status = "upcoming"
        elif now >= int(lottery["ends_at"]):
            effective_status = "awaiting_draw"

    return {
        "id": lottery_id,
        "title": lottery["title"],
        "description": lottery["description"],
        "prize_name": lottery["prize_name"],
        "prize_emoji": lottery["prize_emoji"],
        "ticket_price": int(lottery["ticket_price"]),
        "starts_at": int(lottery["starts_at"]),
        "ends_at": int(lottery["ends_at"]),
        "status": effective_status,
        "total_tickets": int(total_tickets),
        "my_tickets": int(my_tickets),
        "my_chance_percent": round(chance, 6),
        "seed_hash": lottery["seed_hash"],
        "tickets_hash": lottery["tickets_hash"],
        "winning_ticket_id": lottery["winning_ticket_id"],
        "winner_id": lottery["winner_id"],
        "winner_username": winner_username,
        "winner_first_name": winner_first_name,
        "revealed_seed": lottery["secret_seed"] if lottery["status"] == "drawn" else None,
        "drawn_at": int(lottery["drawn_at"] or 0),
    }


def draw_lottery(db, lottery_id: int):
    lottery = db.execute(
        "SELECT * FROM lotteries WHERE id = ?",
        (lottery_id,),
    ).fetchone()
    if not lottery:
        raise HTTPException(404, "Розіграш не знайдено")

    # Immutable result: never redraw an already completed lottery.
    if lottery["status"] == "drawn":
        return lottery

    if int(time.time()) < int(lottery["ends_at"]):
        raise HTTPException(409, "Розіграш ще не завершився")

    tickets = db.execute(
        """
        SELECT id, user_id
        FROM lottery_tickets
        WHERE lottery_id = ?
        ORDER BY id ASC
        """,
        (lottery_id,),
    ).fetchall()

    ticket_ids = [int(row["id"]) for row in tickets]
    tickets_blob = ",".join(map(str, ticket_ids))
    tickets_hash = hashlib.sha256(tickets_blob.encode()).hexdigest()

    winning_ticket_id = None
    winner_id = None

    if tickets:
        # Deterministic, independently reproducible draw:
        # seed was committed before ticket sales via seed_hash.
        draw_material = (
            f"{lottery['secret_seed']}:{lottery_id}:{lottery['ends_at']}:{tickets_hash}"
        )
        digest = hashlib.sha256(draw_material.encode()).digest()
        winner_index = int.from_bytes(digest, "big") % len(tickets)
        winning_ticket_id = int(tickets[winner_index]["id"])
        winner_id = int(tickets[winner_index]["user_id"])

    now = int(time.time())
    db.execute(
        """
        UPDATE lotteries
        SET status = 'drawn',
            tickets_hash = ?,
            winning_ticket_id = ?,
            winner_id = ?,
            drawn_at = ?
        WHERE id = ?
        """,
        (tickets_hash, winning_ticket_id, winner_id, now, lottery_id),
    )
    db.execute(
        """
        INSERT OR IGNORE INTO lottery_draw_log(
            lottery_id, total_tickets, tickets_hash,
            seed_hash, revealed_seed,
            winning_ticket_id, winner_id, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            lottery_id,
            len(tickets),
            tickets_hash,
            lottery["seed_hash"],
            lottery["secret_seed"],
            winning_ticket_id,
            winner_id,
            now,
        ),
    )
    return db.execute(
        "SELECT * FROM lotteries WHERE id = ?",
        (lottery_id,),
    ).fetchone()


def draw_expired_lotteries(db):
    now = int(time.time())
    rows = db.execute(
        """
        SELECT id FROM lotteries
        WHERE status = 'active' AND ends_at <= ?
        ORDER BY id ASC
        """,
        (now,),
    ).fetchall()
    for row in rows:
        draw_lottery(db, int(row["id"]))


def tournament_prize(tournament, place: int):
    return {
        1: int(tournament["prize_1"]),
        2: int(tournament["prize_2"]),
        3: int(tournament["prize_3"]),
    }.get(place, 0)


def finalize_tournament(db, tournament_id: int):
    tournament = db.execute(
        "SELECT * FROM tournaments WHERE id = ?",
        (tournament_id,),
    ).fetchone()
    if not tournament:
        raise HTTPException(404, "Турнір не знайдено")
    if tournament["is_cancelled"]:
        raise HTTPException(409, "Турнір скасовано")
    if tournament["is_finalized"]:
        return []

    standings = db.execute(
        """
        SELECT user_id, score
        FROM tournament_scores
        WHERE tournament_id = ?
        ORDER BY score DESC, updated_at ASC, user_id ASC
        LIMIT 10
        """,
        (tournament_id,),
    ).fetchall()

    now = int(time.time())
    winners = []

    for place, standing in enumerate(standings, start=1):
        reward = tournament_prize(tournament, place)
        db.execute(
            """
            INSERT OR IGNORE INTO tournament_results(
                tournament_id, user_id, place,
                score, reward, rewarded_at, created_at
            )
            VALUES (?, ?, ?, ?, ?, 0, ?)
            """,
            (
                tournament_id,
                standing["user_id"],
                place,
                standing["score"],
                reward,
                now,
            ),
        )

        result = db.execute(
            """
            SELECT rewarded_at
            FROM tournament_results
            WHERE tournament_id = ? AND user_id = ?
            """,
            (tournament_id, standing["user_id"]),
        ).fetchone()

        if reward > 0 and result and not result["rewarded_at"]:
            add_balance(
                db,
                standing["user_id"],
                reward,
                f"Приз за {place} місце: {tournament['title']}",
                max(5, reward // 2),
            )
            db.execute(
                """
                UPDATE tournament_results
                SET rewarded_at = ?
                WHERE tournament_id = ? AND user_id = ?
                """,
                (now, tournament_id, standing["user_id"]),
            )

        winners.append({
            "user_id": standing["user_id"],
            "place": place,
            "score": standing["score"],
            "reward": reward,
        })

    db.execute(
        """
        UPDATE tournaments
        SET is_finalized = 1,
            is_active = 0,
            finalized_at = ?
        WHERE id = ?
        """,
        (now, tournament_id),
    )
    return winners


def finalize_expired_tournaments(db):
    now = int(time.time())
    expired = db.execute(
        """
        SELECT id FROM tournaments
        WHERE is_active = 1
          AND is_finalized = 0
          AND is_cancelled = 0
          AND ends_at <= ?
        """,
        (now,),
    ).fetchall()

    result = []
    for row in expired:
        result.append((row["id"], finalize_tournament(db, row["id"])))
    return result


async def notify_tournament_winners(tournament_id: int, winners: list[dict]):
    if not bot_app or not winners:
        return 0

    with connect_db() as db:
        tournament = db.execute(
            "SELECT title FROM tournaments WHERE id = ?",
            (tournament_id,),
        ).fetchone()

    sent = 0
    for winner in winners:
        if winner["reward"] <= 0:
            continue
        try:
            await bot_app.bot.send_message(
                chat_id=winner["user_id"],
                text=(
                    f"🏆 Турнір завершено!\\n\\n"
                    f"{tournament['title']}\\n"
                    f"Твоє місце: #{winner['place']}\\n"
                    f"Результат: {winner['score']}\\n"
                    f"Нагорода: +{winner['reward']} RH ⭐"
                ),
            )
            sent += 1
        except Exception as error:
            print(f"Не вдалося повідомити переможця {winner['user_id']}: {error}")

    return sent


def active_season(db):
    now = int(time.time())
    return db.execute(
        """
        SELECT * FROM seasons
        WHERE is_active = 1
          AND starts_at <= ?
          AND ends_at >= ?
        ORDER BY id DESC
        LIMIT 1
        """,
        (now, now),
    ).fetchone()


def add_season_progress(db, user_id: int, mission_type: str, amount: int):
    season = active_season(db)
    if not season or amount <= 0:
        return

    missions = db.execute(
        """
        SELECT * FROM season_missions
        WHERE season_id = ?
          AND mission_type = ?
          AND is_active = 1
        """,
        (season["id"], mission_type),
    ).fetchall()

    for mission in missions:
        db.execute(
            """
            INSERT INTO season_mission_progress(
                season_id, user_id, mission_id,
                progress, claimed
            )
            VALUES (?, ?, ?, ?, 0)
            ON CONFLICT(season_id, user_id, mission_id)
            DO UPDATE SET progress = progress + excluded.progress
            """,
            (
                season["id"],
                user_id,
                mission["id"],
                amount,
            ),
        )


def grant_season_xp(db, season_id: int, user_id: int, amount: int):
    if amount <= 0:
        return

    db.execute(
        """
        INSERT INTO season_progress(
            season_id, user_id, season_xp, updated_at
        )
        VALUES (?, ?, ?, ?)
        ON CONFLICT(season_id, user_id)
        DO UPDATE SET
            season_xp = season_xp + excluded.season_xp,
            updated_at = excluded.updated_at
        """,
        (season_id, user_id, amount, int(time.time())),
    )


def today_key():
    return time.strftime("%Y-%m-%d", time.gmtime())


def add_mission_progress(db, user_id: int, mission_type: str, amount: int):
    add_season_progress(db, user_id, mission_type, amount)

    for mission in db.execute(
        "SELECT * FROM daily_missions WHERE mission_type = ? AND is_active = 1",
        (mission_type,),
    ).fetchall():
        db.execute(
            """
            INSERT INTO mission_progress(
                user_id, mission_id, mission_date, progress, claimed
            )
            VALUES (?, ?, ?, ?, 0)
            ON CONFLICT(user_id, mission_id, mission_date)
            DO UPDATE SET progress = progress + excluded.progress
            """,
            (user_id, mission["id"], today_key(), amount),
        )


def add_tournament_score(db, user_id: int, amount: int):
    if amount <= 0:
        return
    now = int(time.time())
    for tournament in db.execute(
        """
        SELECT * FROM tournaments
        WHERE is_active = 1 AND starts_at <= ? AND ends_at >= ?
        """,
        (now, now),
    ).fetchall():
        db.execute(
            """
            INSERT INTO tournament_scores(
                tournament_id, user_id, score, updated_at
            )
            VALUES (?, ?, ?, ?)
            ON CONFLICT(tournament_id, user_id)
            DO UPDATE SET score = score + excluded.score,
                          updated_at = excluded.updated_at
            """,
            (tournament["id"], user_id, amount, now),
        )


def achievement_value(db, user_id: int, achievement):
    user = db.execute(
        "SELECT * FROM users WHERE telegram_id = ?",
        (user_id,),
    ).fetchone()
    kind = achievement["condition_type"]
    if kind == "earned":
        return user["total_earned"]
    if kind == "friends":
        return user["referrals_count"]
    if kind == "tasks":
        return db.execute(
            "SELECT COUNT(*) FROM task_claims WHERE user_id = ?",
            (user_id,),
        ).fetchone()[0]
    if kind == "level":
        return level_info(user["xp"])["number"]
    return 0


def unlock_achievements(db, user_id: int):
    for achievement in db.execute(
        "SELECT * FROM achievements WHERE is_active = 1"
    ).fetchall():
        if achievement_value(db, user_id, achievement) >= achievement["condition_value"]:
            db.execute(
                """
                INSERT OR IGNORE INTO user_achievements(
                    user_id, achievement_id, claimed, unlocked_at
                )
                VALUES (?, ?, 0, ?)
                """,
                (user_id, achievement["id"], int(time.time())),
            )




async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    referrer_id = None

    if context.args and context.args[0].startswith("ref_"):
        raw = context.args[0].replace("ref_", "", 1)
        if raw.isdigit():
            referrer_id = int(raw)

    user = update.effective_user
    upsert_user(
        {
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
        },
        referrer_id,
    )

    if not runtime_webapp_url():
        await update.message.reply_text(
            "✅ Бот працює локально.\n"
            "Для відкриття Mini App у Telegram пізніше додамо WEBAPP_URL."
        )
        return

    keyboard = InlineKeyboardMarkup(
        [[
            InlineKeyboardButton(
                "🎟️ Відкрити ReferHub Lottery",
                web_app=WebAppInfo(url=runtime_webapp_url()),
            )
        ]]
    )

    await update.message.reply_text(
        "🎟️ REFERHUB LOTTERY\n\n"
        "Твій Telegram-центр розіграшів, мініігор та безкоштовних шансів на призи.\n\n"
        "💰 RH — внутрішня валюта ReferHub. Її НЕ можна купити за гроші: "
        "заробляй RH у мінііграх, щоденних активностях, завданнях і за друзів.\n\n"
        "🎫 Витрачай RH тільки на квитки в активних розіграшах. "
        "Більше квитків = більше шансів, але навіть 1 квиток може стати переможним.\n\n"
        "🎮 Усередині є Game Center — грай, став рекорди та поповнюй баланс RH.\n\n"
        "🔎 Розіграші прозорі: до завершення фіксується seed hash, "
        "а після жеребкування відкриваються дані для перевірки результату.\n\n"
        "🏆 Заробляй • купуй квитки • бери участь • перевіряй результат.",
        reply_markup=keyboard,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    global bot_app
    init_database()

    token = runtime_bot_token()
    webapp_url = runtime_webapp_url()
    if token:
        bot_app = Application.builder().token(token).build()
        bot_app.add_handler(CommandHandler("start", start_command))
        await bot_app.initialize()
        await bot_app.start()
        await bot_app.updater.start_polling(drop_pending_updates=True)
        print("✅ Telegram-бот запущено")
    else:
        print("⚠️ BOT_TOKEN порожній — працює лише локальний Mini App")

    yield

    if bot_app:
        await bot_app.updater.stop()
        await bot_app.stop()
        await bot_app.shutdown()


app = FastAPI(title="ReferHub Rewards", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")



@app.middleware("http")
async def rh251_cache_control(request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path.startswith("/api/"):
        response.headers["Cache-Control"] = "private, no-store"
    elif path == "/" or path.endswith(".html"):
        response.headers["Cache-Control"] = "no-cache, max-age=0, must-revalidate"
    elif path.endswith(".js") or path.endswith(".css"):
        response.headers["Cache-Control"] = "no-cache, max-age=0, must-revalidate"
    return response

@app.get("/")
async def index():
    return FileResponse(BASE_DIR / "static" / "index.html")



@app.post("/api/games/dice-duel")
async def play_dice_duel(
    payload: SimpleChoicePayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])
    choice = payload.choice.lower().strip()
    if choice not in {"low", "high"}:
        raise HTTPException(400, "Обери low або high")

    with connect_db() as db:
        setting = get_game_setting(db, "dice_duel")
        game_access_check(db, user_id, setting)
        config = json.loads(setting["config_json"] or "{}")
        roll = random.randint(1, 6)
        win = (choice == "low" and roll <= 3) or (choice == "high" and roll >= 4)
        reward = int(config.get("reward", 4)) if win else 0
        if reward:
            add_balance(db, user_id, reward, "Dice Duel", 2)
            add_mission_progress(db, user_id, "earned", reward)
            add_tournament_score(db, user_id, reward)
        add_mission_progress(db, user_id, "games", 1)
        result_text = f"Dice Duel: {roll} — {'виграш' if win else 'програш'}"
        save_game_play(db, user_id, "dice_duel", 0, reward, result_text)
        db.commit()
        balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()[0]
    return {
        "ok": True, "roll": roll, "win": win,
        "reward": reward, "balance": balance,
        "result_text": result_text,
    }


@app.post("/api/games/rps")
async def play_rps(
    payload: SimpleChoicePayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])
    choice = payload.choice.lower().strip()
    options = ["rock", "paper", "scissors"]
    if choice not in options:
        raise HTTPException(400, "Обери rock, paper або scissors")

    with connect_db() as db:
        setting = get_game_setting(db, "rps")
        game_access_check(db, user_id, setting)
        config = json.loads(setting["config_json"] or "{}")
        bot_choice = secrets.choice(options)
        win = (choice, bot_choice) in {
            ("rock", "scissors"),
            ("paper", "rock"),
            ("scissors", "paper"),
        }
        draw = choice == bot_choice
        reward = (
            int(config.get("win_reward", 5))
            if win else
            int(config.get("draw_reward", 2)) if draw else 0
        )
        if reward:
            add_balance(db, user_id, reward, "RPS Arena", 2)
            add_mission_progress(db, user_id, "earned", reward)
            add_tournament_score(db, user_id, reward)
        add_mission_progress(db, user_id, "games", 1)
        outcome = "перемога" if win else ("нічия" if draw else "програш")
        result_text = f"RPS: {choice} vs {bot_choice} — {outcome}"
        save_game_play(db, user_id, "rps", 0, reward, result_text)
        db.commit()
        balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()[0]
    return {
        "ok": True, "player": choice, "bot": bot_choice,
        "win": win, "draw": draw, "reward": reward,
        "balance": balance, "result_text": result_text,
    }


@app.post("/api/games/treasure-grid")
async def play_treasure_grid(
    payload: TreasureGridPayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])
    with connect_db() as db:
        setting = get_game_setting(db, "treasure_grid")
        game_access_check(db, user_id, setting)
        config = json.loads(setting["config_json"] or "{}")
        cells = int(config.get("cells", 9))
        treasure = secrets.randbelow(cells) + 1
        win = int(payload.cell) == treasure
        reward = int(config.get("reward", 15)) if win else 0
        if reward:
            add_balance(db, user_id, reward, "Treasure Grid", 5)
            add_mission_progress(db, user_id, "earned", reward)
            add_tournament_score(db, user_id, reward)
        add_mission_progress(db, user_id, "games", 1)
        result_text = f"Treasure Grid: обрано {payload.cell}, скарб у {treasure}"
        save_game_play(db, user_id, "treasure_grid", 0, reward, result_text)
        db.commit()
        balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()[0]
    return {
        "ok": True, "treasure": treasure, "win": win,
        "reward": reward, "balance": balance,
        "result_text": result_text,
    }


@app.post("/api/games/reaction/start")
async def reaction_start(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])
    with connect_db() as db:
        setting = get_game_setting(db, "reaction")
        game_access_check(db, user_id, setting)
        now_ms = int(time.time() * 1000)
        delay_ms = 1400 + secrets.randbelow(2200)
        token = secrets.token_urlsafe(24)
        ready_at = now_ms + delay_ms
        expires_at = ready_at + 5000
        db.execute(
            "DELETE FROM reaction_challenges WHERE user_id = ?",
            (user_id,),
        )
        db.execute(
            """
            INSERT INTO reaction_challenges(
                token, user_id, ready_at_ms, expires_at_ms, used
            )
            VALUES (?, ?, ?, ?, 0)
            """,
            (token, user_id, ready_at, expires_at),
        )
        db.commit()
    return {"ok": True, "token": token, "delay_ms": delay_ms}


@app.post("/api/games/reaction/finish")
async def reaction_finish(
    payload: ReactionFinishPayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])
    now_ms = int(time.time() * 1000)

    with connect_db() as db:
        row = db.execute(
            """
            SELECT * FROM reaction_challenges
            WHERE token = ? AND user_id = ?
            """,
            (payload.token, user_id),
        ).fetchone()
        if not row or row["used"]:
            raise HTTPException(409, "Спроба реакції недійсна")
        if now_ms < int(row["ready_at_ms"]):
            db.execute(
                "UPDATE reaction_challenges SET used = 1 WHERE token = ?",
                (payload.token,),
            )
            db.commit()
            raise HTTPException(400, "Зарано! Дочекайся зеленого сигналу")
        if now_ms > int(row["expires_at_ms"]):
            db.execute(
                "UPDATE reaction_challenges SET used = 1 WHERE token = ?",
                (payload.token,),
            )
            db.commit()
            raise HTTPException(400, "Запізно — спроба завершилась")

        setting = get_game_setting(db, "reaction")
        config = json.loads(setting["config_json"] or "{}")
        reaction_ms = now_ms - int(row["ready_at_ms"])

        if reaction_ms <= int(config.get("great_ms", 260)):
            reward = int(config.get("great_reward", 10))
            grade = "БЛИСКАВКА"
        elif reaction_ms <= int(config.get("good_ms", 380)):
            reward = int(config.get("good_reward", 6))
            grade = "ШВИДКО"
        else:
            reward = int(config.get("base_reward", 3))
            grade = "ЗАРАХОВАНО"

        db.execute(
            "UPDATE reaction_challenges SET used = 1 WHERE token = ?",
            (payload.token,),
        )
        add_balance(db, user_id, reward, "Reaction Test", 3)
        add_mission_progress(db, user_id, "games", 1)
        add_mission_progress(db, user_id, "earned", reward)
        add_tournament_score(db, user_id, reward)
        result_text = f"Reaction: {reaction_ms} ms — {grade}"
        save_game_play(db, user_id, "reaction", 0, reward, result_text)
        db.commit()
        balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()[0]

    return {
        "ok": True, "reaction_ms": reaction_ms,
        "grade": grade, "reward": reward,
        "balance": balance, "result_text": result_text,
    }



@app.get("/api/progression-v21")
async def progression_v21(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])
    now = int(time.time())

    with connect_db() as db:
        row = db.execute(
            "SELECT * FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()
        if not row:
            raise HTTPException(404, "Користувача не знайдено")

        tickets = db.execute(
            "SELECT COUNT(*) FROM lottery_tickets WHERE user_id = ?",
            (user_id,),
        ).fetchone()[0]
        draws_joined = db.execute(
            "SELECT COUNT(DISTINCT lottery_id) FROM lottery_tickets WHERE user_id = ?",
            (user_id,),
        ).fetchone()[0]
        wins = db.execute(
            "SELECT COUNT(*) FROM lotteries WHERE winner_id = ? AND status = 'drawn'",
            (user_id,),
        ).fetchone()[0]

        games_played = db.execute(
            "SELECT COUNT(*) FROM game_plays WHERE user_id = ?",
            (user_id,),
        ).fetchone()[0]
        games_won = db.execute(
            "SELECT COUNT(*) FROM game_plays WHERE user_id = ? AND reward > 0",
            (user_id,),
        ).fetchone()[0]
        games_earned = db.execute(
            "SELECT COALESCE(SUM(reward),0) FROM game_plays WHERE user_id = ?",
            (user_id,),
        ).fetchone()[0]

        tasks_completed = db.execute(
            "SELECT COUNT(*) FROM task_claims WHERE user_id = ?",
            (user_id,),
        ).fetchone()[0]
        achievements_unlocked = db.execute(
            "SELECT COUNT(*) FROM user_achievements WHERE user_id = ?",
            (user_id,),
        ).fetchone()[0]

        last_daily = db.execute(
            """
            SELECT streak, claimed_at
            FROM daily_claims
            WHERE user_id = ?
            ORDER BY id DESC LIMIT 1
            """,
            (user_id,),
        ).fetchone()
        streak = int(last_daily["streak"]) if last_daily else 0

        xp = int(row["xp"] or 0)
        level = level_info(xp)
        created_at = int(row["created_at"] or now)
        account_age_days = max(0, (now - created_at) // 86400)

        badges = []
        def badge(code, icon, title, description, unlocked):
            badges.append({
                "code": code,
                "icon": icon,
                "title": title,
                "description": description,
                "unlocked": bool(unlocked),
            })

        badge("starter", "✦", "Перший крок", "Приєднатися до ReferHub", True)
        badge("streak7", "🔥", "7 днів", "Серія входів 7 днів", streak >= 7)
        badge("gamer25", "🎮", "Аркадник", "Зіграти 25 мініігор", games_played >= 25)
        badge("winner", "👑", "Переможець", "Виграти хоча б один розіграш", wins >= 1)
        badge("tickets50", "🎟️", "Колекціонер шансів", "Придбати 50 квитків", tickets >= 50)
        badge("ref10", "👥", "Амбасадор", "Запросити 10 друзів", int(row["referrals_count"] or 0) >= 10)
        badge("rh1000", "💎", "RH Hunter", "Заробити 1000 RH за весь час", int(row["total_earned"] or 0) >= 1000)
        badge("veteran30", "🛡️", "Ветеран", "30 днів у ReferHub", account_age_days >= 30)

        milestones = [
            {
                "title": "50 квитків",
                "icon": "🎟️",
                "current": min(int(tickets), 50),
                "target": 50,
                "done": tickets >= 50,
            },
            {
                "title": "25 переможних ігор",
                "icon": "🎮",
                "current": min(int(games_won), 25),
                "target": 25,
                "done": games_won >= 25,
            },
            {
                "title": "10 рефералів",
                "icon": "👥",
                "current": min(int(row["referrals_count"] or 0), 10),
                "target": 10,
                "done": int(row["referrals_count"] or 0) >= 10,
            },
            {
                "title": "7-денна серія",
                "icon": "🔥",
                "current": min(streak, 7),
                "target": 7,
                "done": streak >= 7,
            },
        ]

        return {
            "level": level,
            "xp": xp,
            "balance": int(row["balance"] or 0),
            "total_earned": int(row["total_earned"] or 0),
            "stars": int(row["stars"] or 0),
            "streak": streak,
            "tickets": int(tickets),
            "draws_joined": int(draws_joined),
            "wins": int(wins),
            "games_played": int(games_played),
            "games_won": int(games_won),
            "games_earned": int(games_earned),
            "tasks_completed": int(tasks_completed),
            "achievements_unlocked": int(achievements_unlocked),
            "referrals": int(row["referrals_count"] or 0),
            "account_age_days": int(account_age_days),
            "badges": badges,
            "milestones": milestones,
        }



@app.get("/api/live-events")
async def get_live_events(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])
    now = int(time.time())

    with connect_db() as db:
        rows = db.execute(
            """
            SELECT * FROM live_events
            WHERE active = 1 AND starts_at <= ? AND ends_at > ?
            ORDER BY ends_at ASC, id ASC
            """,
            (now, now),
        ).fetchall()

        result = []
        for row in rows:
            claimed = db.execute(
                """
                SELECT 1 FROM live_event_claims
                WHERE event_id = ? AND user_id = ?
                """,
                (int(row["id"]), user_id),
            ).fetchone()

            result.append({
                "id": int(row["id"]),
                "event_key": row["event_key"],
                "title": row["title"],
                "subtitle": row["subtitle"],
                "description": row["description"],
                "icon": row["icon"],
                "event_type": row["event_type"],
                "starts_at": int(row["starts_at"]),
                "ends_at": int(row["ends_at"]),
                "multiplier": float(row["multiplier"] or 1.0),
                "reward_amount": int(row["reward_amount"] or 0),
                "game_key": row["game_key"],
                "lottery_id": row["lottery_id"],
                "claimed": bool(claimed),
                "seconds_left": max(0, int(row["ends_at"]) - now),
            })
        return result


@app.post("/api/live-events/{event_id}/claim")
async def claim_live_event(
    event_id: int,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])
    now = int(time.time())

    with connect_db() as db:
        db.execute("BEGIN IMMEDIATE")
        event = db.execute(
            """
            SELECT * FROM live_events
            WHERE id = ? AND active = 1
            """,
            (event_id,),
        ).fetchone()

        if not event:
            db.rollback()
            raise HTTPException(404, "Подію не знайдено")
        if now < int(event["starts_at"]) or now >= int(event["ends_at"]):
            db.rollback()
            raise HTTPException(409, "Подія вже не активна")
        if event["event_type"] != "claim":
            db.rollback()
            raise HTTPException(400, "Ця подія не має ручної нагороди")

        existing = db.execute(
            """
            SELECT 1 FROM live_event_claims
            WHERE event_id = ? AND user_id = ?
            """,
            (event_id, user_id),
        ).fetchone()
        if existing:
            db.rollback()
            raise HTTPException(409, "Нагороду вже отримано")

        reward = int(event["reward_amount"] or 0)
        db.execute(
            """
            INSERT INTO live_event_claims(event_id,user_id,claimed_at,reward)
            VALUES (?,?,?,?)
            """,
            (event_id,user_id,now,reward),
        )
        if reward:
            db.execute(
                """
                UPDATE users SET balance = balance + ?, total_earned = total_earned + ?
                WHERE telegram_id = ?
                """,
                (reward,reward,user_id),
            )
            db.execute(
                """
                INSERT INTO ledger(user_id,amount,note,created_at)
                VALUES (?,?,?,?)
                """,
                (user_id,reward,f"Live Event: {event['title']}",now),
            )
        db.commit()

        balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()[0]

    return {"ok":True,"reward":reward,"balance":int(balance)}



@app.get("/api/daily-v23")
async def daily_v23(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])
    now = int(time.time())
    day_key = time.strftime("%Y-%m-%d", time.gmtime(now))
    rewards = [10, 15, 20, 25, 35, 50, 100]

    with connect_db() as db:
        rows = db.execute(
            """
            SELECT day_key, cycle_day, reward, claimed_at
            FROM daily_calendar_claims
            WHERE user_id = ?
            ORDER BY claimed_at DESC LIMIT 14
            """,
            (user_id,),
        ).fetchall()

        claimed_today = next((r for r in rows if r["day_key"] == day_key), None)
        streak = 0
        if rows:
            keys = {r["day_key"] for r in rows}
            for offset in range(0, 14):
                k = time.strftime("%Y-%m-%d", time.gmtime(now - offset * 86400))
                if k in keys:
                    streak += 1
                elif offset == 0:
                    continue
                else:
                    break

        cycle_day = (streak % 7) + 1 if not claimed_today else int(claimed_today["cycle_day"])
        calendar = []
        for i, reward in enumerate(rewards, start=1):
            calendar.append({
                "day": i,
                "reward": reward,
                "current": i == cycle_day,
                "claimed": i < cycle_day or (claimed_today is not None and i == cycle_day),
                "final": i == 7,
            })

        drops = db.execute(
            """
            SELECT * FROM mystery_drops
            WHERE active = 1 AND starts_at <= ? AND ends_at > ?
            ORDER BY ends_at ASC
            """,
            (now, now),
        ).fetchall()
        drop_items = []
        for d in drops:
            claimed = db.execute(
                "SELECT 1 FROM mystery_drop_claims WHERE drop_id = ? AND user_id = ?",
                (int(d["id"]), user_id),
            ).fetchone()
            drop_items.append({
                "id": int(d["id"]),
                "title": d["title"],
                "reward": int(d["reward"]),
                "ends_at": int(d["ends_at"]),
                "seconds_left": max(0, int(d["ends_at"]) - now),
                "claimed": bool(claimed),
            })

        return {
            "day_key": day_key,
            "streak": streak,
            "cycle_day": cycle_day,
            "claimed_today": bool(claimed_today),
            "today_reward": rewards[cycle_day - 1],
            "calendar": calendar,
            "drops": drop_items,
        }


@app.post("/api/daily-v23/claim")
async def claim_daily_v23(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])
    now = int(time.time())
    day_key = time.strftime("%Y-%m-%d", time.gmtime(now))
    rewards = [10, 15, 20, 25, 35, 50, 100]

    with connect_db() as db:
        db.execute("BEGIN IMMEDIATE")
        exists = db.execute(
            "SELECT 1 FROM daily_calendar_claims WHERE user_id = ? AND day_key = ?",
            (user_id, day_key),
        ).fetchone()
        if exists:
            db.rollback()
            raise HTTPException(409, "Сьогоднішню нагороду вже отримано")

        yesterday = time.strftime("%Y-%m-%d", time.gmtime(now - 86400))
        last = db.execute(
            """
            SELECT cycle_day, day_key FROM daily_calendar_claims
            WHERE user_id = ? ORDER BY claimed_at DESC LIMIT 1
            """,
            (user_id,),
        ).fetchone()
        cycle_day = ((int(last["cycle_day"]) % 7) + 1) if last and last["day_key"] == yesterday else 1
        reward = rewards[cycle_day - 1]

        db.execute(
            """
            INSERT INTO daily_calendar_claims(user_id,day_key,cycle_day,reward,claimed_at)
            VALUES (?,?,?,?,?)
            """,
            (user_id,day_key,cycle_day,reward,now),
        )
        db.execute(
            """
            UPDATE users SET balance = balance + ?, total_earned = total_earned + ?
            WHERE telegram_id = ?
            """,
            (reward,reward,user_id),
        )
        db.execute(
            "INSERT INTO ledger(user_id,amount,note,created_at) VALUES (?,?,?,?)",
            (user_id,reward,f"Daily Calendar Day {cycle_day}",now),
        )
        db.commit()
        balance = db.execute("SELECT balance FROM users WHERE telegram_id = ?",(user_id,)).fetchone()[0]

    return {"ok":True,"reward":reward,"cycle_day":cycle_day,"balance":int(balance)}


@app.post("/api/mystery-drop-v23/{drop_id}/claim")
async def claim_mystery_drop_v23(
    drop_id: int,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])
    now = int(time.time())

    with connect_db() as db:
        db.execute("BEGIN IMMEDIATE")
        drop = db.execute(
            """
            SELECT * FROM mystery_drops
            WHERE id = ? AND active = 1 AND starts_at <= ? AND ends_at > ?
            """,
            (drop_id,now,now),
        ).fetchone()
        if not drop:
            db.rollback()
            raise HTTPException(404,"Mystery Drop уже не активний")
        if db.execute(
            "SELECT 1 FROM mystery_drop_claims WHERE drop_id = ? AND user_id = ?",
            (drop_id,user_id),
        ).fetchone():
            db.rollback()
            raise HTTPException(409,"Mystery Drop уже отримано")

        reward=int(drop["reward"])
        db.execute(
            "INSERT INTO mystery_drop_claims(drop_id,user_id,reward,claimed_at) VALUES (?,?,?,?)",
            (drop_id,user_id,reward,now),
        )
        db.execute(
            "UPDATE users SET balance=balance+?, total_earned=total_earned+? WHERE telegram_id=?",
            (reward,reward,user_id),
        )
        db.execute(
            "INSERT INTO ledger(user_id,amount,note,created_at) VALUES (?,?,?,?)",
            (user_id,reward,"Mystery Drop",now),
        )
        db.commit()
        balance=db.execute("SELECT balance FROM users WHERE telegram_id=?",(user_id,)).fetchone()[0]

    return {"ok":True,"reward":reward,"balance":int(balance)}



@app.get("/api/season-v24")
async def season_v24(x_telegram_init_data: str | None = Header(default=None)):
    user=current_user(x_telegram_init_data); uid=int(user["id"]); now=int(time.time())
    rewards=[10,15,20,25,30,40,50,60,75,100,25,35,45,55,70,85,100,125,150,250]
    with connect_db() as db:
        s=db.execute("SELECT * FROM seasons WHERE active=1 AND starts_at<=? AND ends_at>? ORDER BY id DESC LIMIT 1",(now,now)).fetchone()
        if not s: return {"active":False}
        # Progress derives from existing activity so v2.4 works immediately.
        u=db.execute("SELECT xp FROM users WHERE telegram_id=?",(uid,)).fetchone()
        base_xp=int(u["xp"] or 0) if u else 0
        gp=int(db.execute("SELECT COUNT(*) FROM game_plays WHERE user_id=?",(uid,)).fetchone()[0])
        tc=int(db.execute("SELECT COUNT(*) FROM lottery_tickets WHERE user_id=?",(uid,)).fetchone()[0])
        season_xp=max(base_xp, gp*8 + tc*4)
        db.execute("""INSERT INTO season_progress(season_id,user_id,xp,updated_at) VALUES(?,?,?,?)
                    ON CONFLICT(season_id,user_id) DO UPDATE SET xp=MAX(xp,excluded.xp),updated_at=excluded.updated_at""",
                   (int(s["id"]),uid,season_xp,now))
        db.commit()
        claimed={int(r["level"]) for r in db.execute("SELECT level FROM season_claims WHERE season_id=? AND user_id=?",(int(s["id"]),uid)).fetchall()}
        levels=[]
        step=100
        for i,reward in enumerate(rewards,1):
            req=i*step
            levels.append({"level":i,"required_xp":req,"reward":reward,"unlocked":season_xp>=req,"claimed":i in claimed,"special":i in (5,10,15,20)})
        return {"active":True,"id":int(s["id"]),"title":s["title"],"subtitle":s["subtitle"],
                "xp":season_xp,"level":min(20,season_xp//step),"ends_at":int(s["ends_at"]),
                "seconds_left":max(0,int(s["ends_at"])-now),"levels":levels}

@app.post("/api/season-v24/claim/{level}")
async def claim_season_v24(level:int,x_telegram_init_data: str | None = Header(default=None)):
    user=current_user(x_telegram_init_data); uid=int(user["id"]); now=int(time.time())
    rewards=[10,15,20,25,30,40,50,60,75,100,25,35,45,55,70,85,100,125,150,250]
    if level<1 or level>len(rewards): raise HTTPException(400,"Невірний рівень")
    with connect_db() as db:
        db.execute("BEGIN IMMEDIATE")
        s=db.execute("SELECT * FROM seasons WHERE active=1 AND starts_at<=? AND ends_at>? ORDER BY id DESC LIMIT 1",(now,now)).fetchone()
        if not s: db.rollback(); raise HTTPException(404,"Сезон не активний")
        prog=db.execute("SELECT xp FROM season_progress WHERE season_id=? AND user_id=?",(int(s["id"]),uid)).fetchone()
        xp=int(prog["xp"] or 0) if prog else 0
        if xp < level*100: db.rollback(); raise HTTPException(409,"Рівень ще не відкритий")
        if db.execute("SELECT 1 FROM season_claims WHERE season_id=? AND user_id=? AND level=?",(int(s["id"]),uid,level)).fetchone():
            db.rollback(); raise HTTPException(409,"Нагороду вже отримано")
        reward=rewards[level-1]
        db.execute("INSERT INTO season_claims(season_id,user_id,level,claimed_at) VALUES(?,?,?,?)",(int(s["id"]),uid,level,now))
        db.execute("UPDATE users SET balance=balance+?,total_earned=total_earned+? WHERE telegram_id=?",(reward,reward,uid))
        db.execute("INSERT INTO ledger(user_id,amount,note,created_at) VALUES(?,?,?,?)",(uid,reward,f"Season 01 Level {level}",now))
        db.commit()
        bal=int(db.execute("SELECT balance FROM users WHERE telegram_id=?",(uid,)).fetchone()[0])
    return {"ok":True,"reward":reward,"balance":bal}



@app.get("/api/social-v26")
async def social_v26(x_telegram_init_data: str | None = Header(default=None)):
    user=current_user(x_telegram_init_data); uid=int(user["id"])
    with connect_db() as db:
        me=db.execute("SELECT * FROM users WHERE telegram_id=?",(uid,)).fetchone()
        followers=int(db.execute("SELECT COUNT(*) FROM social_follows WHERE followed_id=?",(uid,)).fetchone()[0])
        following=int(db.execute("SELECT COUNT(*) FROM social_follows WHERE follower_id=?",(uid,)).fetchone()[0])
        # Friends are mutual follows.
        friends=int(db.execute("""SELECT COUNT(*) FROM social_follows a
            WHERE a.follower_id=? AND EXISTS(
              SELECT 1 FROM social_follows b WHERE b.follower_id=a.followed_id AND b.followed_id=?
            )""",(uid,uid)).fetchone()[0])
        # Build useful activity from real existing game/lottery data when dedicated feed is empty.
        acts=[dict(r) for r in db.execute("SELECT kind,title,subtitle,icon,created_at FROM social_activity WHERE user_id=? ORDER BY id DESC LIMIT 8",(uid,)).fetchall()]
        if not acts:
            gp=int(db.execute("SELECT COUNT(*) FROM game_plays WHERE user_id=?",(uid,)).fetchone()[0])
            tk=int(db.execute("SELECT COUNT(*) FROM lottery_tickets WHERE user_id=?",(uid,)).fetchone()[0])
            acts=[
              {"kind":"games","title":"Ігрова активність","subtitle":f"Зіграно {gp} раундів","icon":"🎮","created_at":0},
              {"kind":"tickets","title":"Квитки у розіграшах","subtitle":f"Отримано {tk} квитків","icon":"🎟️","created_at":0}
            ]
        return {"followers":followers,"following":following,"friends":friends,
                "username":(me["username"] if me and "username" in me.keys() else None),
                "first_name":(me["first_name"] if me and "first_name" in me.keys() else None),
                "activity":acts}

@app.get("/api/social-v26/search")
async def social_v26_search(q: str="", x_telegram_init_data: str | None = Header(default=None)):
    user=current_user(x_telegram_init_data); uid=int(user["id"]); q=(q or "").strip().lstrip("@")
    if len(q)<2: return {"users":[]}
    with connect_db() as db:
        rows=db.execute("""SELECT telegram_id,username,first_name,xp FROM users
          WHERE telegram_id<>? AND (LOWER(COALESCE(username,'')) LIKE LOWER(?) OR LOWER(COALESCE(first_name,'')) LIKE LOWER(?))
          ORDER BY xp DESC LIMIT 12""",(uid,f"%{q}%",f"%{q}%")).fetchall()
        out=[]
        for r in rows:
            rid=int(r["telegram_id"])
            followed=bool(db.execute("SELECT 1 FROM social_follows WHERE follower_id=? AND followed_id=?",(uid,rid)).fetchone())
            out.append({"id":rid,"username":r["username"],"first_name":r["first_name"],"xp":int(r["xp"] or 0),"followed":followed})
        return {"users":out}

@app.post("/api/social-v26/follow/{target_id}")
async def social_v26_follow(target_id:int,x_telegram_init_data: str | None = Header(default=None)):
    user=current_user(x_telegram_init_data); uid=int(user["id"]); now=int(time.time())
    if target_id==uid: raise HTTPException(400,"Не можна підписатися на себе")
    with connect_db() as db:
        if not db.execute("SELECT 1 FROM users WHERE telegram_id=?",(target_id,)).fetchone():
            raise HTTPException(404,"Користувача не знайдено")
        old=db.execute("SELECT 1 FROM social_follows WHERE follower_id=? AND followed_id=?",(uid,target_id)).fetchone()
        if old:
            db.execute("DELETE FROM social_follows WHERE follower_id=? AND followed_id=?",(uid,target_id)); followed=False
        else:
            db.execute("INSERT INTO social_follows(follower_id,followed_id,created_at) VALUES(?,?,?)",(uid,target_id,now)); followed=True
        db.commit()
    return {"ok":True,"followed":followed}



@app.get("/api/game-center-v27")
async def game_center_v27(
    x_telegram_init_data: str | None = Header(default=None),
):
    user=current_user(x_telegram_init_data)
    uid=int(user["id"])
    now=int(time.time())
    day_index=int(time.strftime("%j", time.gmtime(now)))

    game_keys=[
        "roulette","daily_case","slot","coin_flip","number_guess","scratch",
        "safe_crack","dice_duel","rps","treasure_grid","reaction"
    ]
    featured=game_keys[day_index % len(game_keys)]

    with connect_db() as db:
        my=db.execute(
            """
            SELECT COUNT(*) AS plays,
                   COALESCE(SUM(reward),0) AS earned,
                   COALESCE(MAX(reward),0) AS best,
                   COUNT(DISTINCT game_key) AS modes
            FROM game_plays WHERE user_id=?
            """,
            (uid,),
        ).fetchone()

        top=db.execute(
            """
            SELECT u.telegram_id,u.username,u.first_name,
                   COUNT(g.id) AS plays,
                   COALESCE(SUM(g.reward),0) AS earned,
                   COALESCE(MAX(g.reward),0) AS best
            FROM game_plays g
            JOIN users u ON u.telegram_id=g.user_id
            GROUP BY u.telegram_id,u.username,u.first_name
            ORDER BY earned DESC,plays DESC
            LIMIT 8
            """
        ).fetchall()

        recent=db.execute(
            """
            SELECT game_key,reward,result_text,created_at
            FROM game_plays
            WHERE user_id=?
            ORDER BY id DESC LIMIT 8
            """,
            (uid,),
        ).fetchall()

    return {
        "featured_game": featured,
        "stats": {
            "plays": int(my["plays"] or 0),
            "earned": int(my["earned"] or 0),
            "best": int(my["best"] or 0),
            "modes": int(my["modes"] or 0),
        },
        "leaderboard": [
            {
                "id": int(r["telegram_id"]),
                "username": r["username"],
                "first_name": r["first_name"],
                "plays": int(r["plays"] or 0),
                "earned": int(r["earned"] or 0),
                "best": int(r["best"] or 0),
            } for r in top
        ],
        "recent": [
            {
                "game_key": r["game_key"],
                "reward": int(r["reward"] or 0),
                "result_text": r["result_text"],
                "created_at": int(r["created_at"] or 0),
            } for r in recent
        ],
    }



@app.get("/api/cosmetics-v28")
async def cosmetics_v28(
    x_telegram_init_data: str | None = Header(default=None),
):
    user=current_user(x_telegram_init_data)
    uid=int(user["id"])

    with connect_db() as db:
        u=db.execute("SELECT * FROM users WHERE telegram_id=?",(uid,)).fetchone()
        if not u:
            raise HTTPException(404,"Користувача не знайдено")

        xp=int(u["xp"] or 0)
        level=max(1, xp//100 + 1)
        wins=int(db.execute(
            "SELECT COUNT(*) FROM lotteries WHERE winner_id=? AND status='drawn'",
            (uid,)
        ).fetchone()[0])
        games=int(db.execute(
            "SELECT COUNT(*) FROM game_plays WHERE user_id=?",
            (uid,)
        ).fetchone()[0])

        rows=db.execute(
            "SELECT * FROM cosmetics WHERE active=1 ORDER BY sort_order,id"
        ).fetchall()

        unlocked_db={r["cosmetic_key"] for r in db.execute(
            "SELECT cosmetic_key FROM user_cosmetics WHERE user_id=?",(uid,)
        ).fetchall()}

        equips={r["cosmetic_type"]:r["cosmetic_key"] for r in db.execute(
            "SELECT cosmetic_type,cosmetic_key FROM user_cosmetic_equips WHERE user_id=?",(uid,)
        ).fetchall()}

        items=[]
        for r in rows:
            key=r["cosmetic_key"]
            unlock_type=r["unlock_type"]
            value=int(r["unlock_value"] or 0)

            unlocked=key in unlocked_db
            if unlock_type=="free":
                unlocked=True
            elif unlock_type=="level":
                unlocked=level>=value
            elif unlock_type=="wins":
                unlocked=wins>=value
            elif unlock_type=="games":
                unlocked=games>=value

            if unlocked and key not in unlocked_db:
                db.execute(
                    "INSERT OR IGNORE INTO user_cosmetics(user_id,cosmetic_key,unlocked_at) VALUES(?,?,?)",
                    (uid,key,int(time.time()))
                )

            items.append({
                "key":key,
                "type":r["cosmetic_type"],
                "title":r["title"],
                "subtitle":r["subtitle"],
                "rarity":r["rarity"],
                "unlock_type":unlock_type,
                "unlock_value":value,
                "css_class":r["css_class"],
                "icon":r["icon"],
                "unlocked":bool(unlocked),
                "equipped":equips.get(r["cosmetic_type"])==key
            })

        db.commit()

        # Defaults if user hasn't equipped anything yet.
        defaults={
            "frame":"frame_default",
            "background":"bg_night",
            "title":"title_player",
            "effect":"effect_none"
        }
        for typ,key in defaults.items():
            if typ not in equips:
                db.execute(
                    """
                    INSERT INTO user_cosmetic_equips(user_id,cosmetic_type,cosmetic_key,updated_at)
                    VALUES(?,?,?,?)
                    ON CONFLICT(user_id,cosmetic_type) DO UPDATE SET cosmetic_key=excluded.cosmetic_key,updated_at=excluded.updated_at
                    """,
                    (uid,typ,key,int(time.time()))
                )
                equips[typ]=key
        db.commit()

        return {
            "level":level,
            "wins":wins,
            "games":games,
            "items":items,
            "equipped":equips
        }


@app.post("/api/cosmetics-v28/equip/{cosmetic_key}")
async def cosmetics_v28_equip(
    cosmetic_key: str,
    x_telegram_init_data: str | None = Header(default=None),
):
    user=current_user(x_telegram_init_data)
    uid=int(user["id"])
    now=int(time.time())

    with connect_db() as db:
        item=db.execute(
            "SELECT * FROM cosmetics WHERE cosmetic_key=? AND active=1",
            (cosmetic_key,)
        ).fetchone()
        if not item:
            raise HTTPException(404,"Косметику не знайдено")

        u=db.execute("SELECT xp FROM users WHERE telegram_id=?",(uid,)).fetchone()
        level=max(1,int(u["xp"] or 0)//100+1) if u else 1
        wins=int(db.execute(
            "SELECT COUNT(*) FROM lotteries WHERE winner_id=? AND status='drawn'",(uid,)
        ).fetchone()[0])
        games=int(db.execute(
            "SELECT COUNT(*) FROM game_plays WHERE user_id=?",(uid,)
        ).fetchone()[0])

        typ=item["unlock_type"]
        val=int(item["unlock_value"] or 0)

        allowed = (
            typ=="free" or
            (typ=="level" and level>=val) or
            (typ=="wins" and wins>=val) or
            (typ=="games" and games>=val) or
            bool(db.execute(
                "SELECT 1 FROM user_cosmetics WHERE user_id=? AND cosmetic_key=?",
                (uid,cosmetic_key)
            ).fetchone())
        )

        if not allowed:
            raise HTTPException(409,"Ця косметика ще не відкрита")

        db.execute(
            "INSERT OR IGNORE INTO user_cosmetics(user_id,cosmetic_key,unlocked_at) VALUES(?,?,?)",
            (uid,cosmetic_key,now)
        )
        db.execute(
            """
            INSERT INTO user_cosmetic_equips(user_id,cosmetic_type,cosmetic_key,updated_at)
            VALUES(?,?,?,?)
            ON CONFLICT(user_id,cosmetic_type)
            DO UPDATE SET cosmetic_key=excluded.cosmetic_key,updated_at=excluded.updated_at
            """,
            (uid,item["cosmetic_type"],cosmetic_key,now)
        )
        db.commit()

    return {
        "ok":True,
        "type":item["cosmetic_type"],
        "key":cosmetic_key,
        "css_class":item["css_class"]
    }


@app.get("/api/cosmetics-v28/equipped")
async def cosmetics_v28_equipped(
    x_telegram_init_data: str | None = Header(default=None),
):
    user=current_user(x_telegram_init_data)
    uid=int(user["id"])

    with connect_db() as db:
        rows=db.execute(
            """
            SELECT e.cosmetic_type,e.cosmetic_key,c.css_class,c.title,c.icon
            FROM user_cosmetic_equips e
            LEFT JOIN cosmetics c ON c.cosmetic_key=e.cosmetic_key
            WHERE e.user_id=?
            """,
            (uid,)
        ).fetchall()

    return {
        r["cosmetic_type"]:{
            "key":r["cosmetic_key"],
            "css_class":r["css_class"],
            "title":r["title"],
            "icon":r["icon"]
        } for r in rows
    }




def _rh29_cols(db, table):
    try:
        return {r["name"] for r in db.execute(f"PRAGMA table_info({table})").fetchall()}
    except Exception:
        return set()

def _rh29_rowdict(r):
    return dict(r) if r is not None else {}

def _rh29_lottery_payload(db, row, uid):
    x=_rh29_rowdict(row)
    lid=int(x.get("id") or 0)
    lc=_rh29_cols(db,"lotteries")
    tc=_rh29_cols(db,"lottery_tickets")

    # Normalize existing project fields.
    result=dict(x)
    result["prize_title"]=x.get("prize_title") or x.get("title") or x.get("name") or f"Розіграш #{lid}"
    result["description"]=x.get("description") or x.get("details") or ""
    result["ticket_price"]=int(x.get("ticket_price") or x.get("price") or x.get("cost") or 0)
    result["ends_at"]=int(x.get("ends_at") or x.get("end_at") or x.get("draw_at") or 0)
    result["status"]=x.get("status") or "active"

    total=0; mine=0; people=0
    if tc:
        lot_col=next((c for c in ("lottery_id","draw_id","raffle_id") if c in tc),None)
        user_col=next((c for c in ("user_id","telegram_id") if c in tc),None)
        qty_col=next((c for c in ("quantity","tickets","count") if c in tc),None)
        if lot_col:
            total=int(db.execute(
                f"SELECT COALESCE(SUM({qty_col}),0) FROM lottery_tickets WHERE {lot_col}=?" if qty_col
                else f"SELECT COUNT(*) FROM lottery_tickets WHERE {lot_col}=?",(lid,)
            ).fetchone()[0] or 0)
            if user_col:
                people=int(db.execute(
                    f"SELECT COUNT(DISTINCT {user_col}) FROM lottery_tickets WHERE {lot_col}=?",(lid,)
                ).fetchone()[0] or 0)
                mine=int(db.execute(
                    f"SELECT COALESCE(SUM({qty_col}),0) FROM lottery_tickets WHERE {lot_col}=? AND {user_col}=?" if qty_col
                    else f"SELECT COUNT(*) FROM lottery_tickets WHERE {lot_col}=? AND {user_col}=?",(lid,uid)
                ).fetchone()[0] or 0)

    # Fall back to aggregate fields if old schema stores counts on lotteries.
    result["total_tickets"]=total or int(x.get("total_tickets") or x.get("tickets_count") or 0)
    result["participants"]=people or int(x.get("participants") or x.get("participants_count") or 0)
    result["my_tickets"]=mine

    # Normalize winner display if available.
    result["winner_name"]=x.get("winner_name") or x.get("winner_username") or ""
    return result


@app.get("/api/lottery-v29")
async def lottery_v29(
    x_telegram_init_data: str | None = Header(default=None),
):
    user=current_user(x_telegram_init_data)
    uid=int(user["id"])
    with connect_db() as db:
        if not _rh29_cols(db,"lotteries"):
            return {"active":[],"history":[]}
        rows=db.execute("SELECT * FROM lotteries ORDER BY id DESC").fetchall()
        items=[_rh29_lottery_payload(db,r,uid) for r in rows]
    active=[x for x in items if str(x.get("status","active")).lower() in ("active","open","live","running")]
    history=[x for x in items if x not in active]
    return {"active":active,"history":history}


@app.post("/api/lottery-v29/{lottery_id}/buy")
async def lottery_v29_buy(
    lottery_id: int,
    request: Request,
    x_telegram_init_data: str | None = Header(default=None),
):
    user=current_user(x_telegram_init_data)
    uid=int(user["id"])
    body=await request.json()
    qty=max(1,min(100,int(body.get("quantity") or 1)))

    with connect_db() as db:
        lc=_rh29_cols(db,"lotteries")
        tc=_rh29_cols(db,"lottery_tickets")
        if not lc:
            raise HTTPException(404,"Розіграш не знайдено")
        lot=db.execute("SELECT * FROM lotteries WHERE id=?",(lottery_id,)).fetchone()
        if not lot:
            raise HTTPException(404,"Розіграш не знайдено")
        x=dict(lot)
        if str(x.get("status","active")).lower() not in ("active","open","live","running"):
            raise HTTPException(409,"Цей розіграш уже завершено")

        price=int(x.get("ticket_price") or x.get("price") or x.get("cost") or 0)
        total=price*qty

        uc=_rh29_cols(db,"users")
        id_col="telegram_id" if "telegram_id" in uc else ("user_id" if "user_id" in uc else "id")
        bal_col=next((c for c in ("balance","stars","rh_stars","coins") if c in uc),None)
        if not bal_col:
            raise HTTPException(500,"Не знайдено поле балансу")

        ur=db.execute(f"SELECT {bal_col} FROM users WHERE {id_col}=?",(uid,)).fetchone()
        if not ur:
            raise HTTPException(404,"Користувача не знайдено")
        balance=int(ur[0] or 0)
        if balance<total:
            raise HTTPException(409,"Недостатньо RH Stars")

        lot_col=next((c for c in ("lottery_id","draw_id","raffle_id") if c in tc),None)
        user_col=next((c for c in ("user_id","telegram_id") if c in tc),None)
        qty_col=next((c for c in ("quantity","tickets","count") if c in tc),None)
        if not (lot_col and user_col):
            raise HTTPException(500,"Таблиця білетів має несумісну структуру")

        db.execute(f"UPDATE users SET {bal_col}={bal_col}-? WHERE {id_col}=?",(total,uid))

        cols=[lot_col,user_col]
        vals=[lottery_id,uid]
        if qty_col:
            cols.append(qty_col); vals.append(qty)
        if "created_at" in tc:
            cols.append("created_at"); vals.append(int(time.time()))
        placeholders=",".join("?" for _ in vals)
        db.execute(f"INSERT INTO lottery_tickets({','.join(cols)}) VALUES({placeholders})",tuple(vals))
        db.commit()

    return {"ok":True,"quantity":qty,"spent":total}


@app.get("/api/home-v30")
async def home_v30(
    x_telegram_init_data: str | None = Header(default=None),
):
    user=current_user(x_telegram_init_data)
    uid=int(user["id"])
    now=int(time.time())

    with connect_db() as db:
        u=db.execute("SELECT * FROM users WHERE telegram_id=?",(uid,)).fetchone()
        if not u:
            raise HTTPException(404,"Користувача не знайдено")

        balance=int(u["balance"] or 0) if "balance" in u.keys() else 0
        xp=int(u["xp"] or 0) if "xp" in u.keys() else 0
        level=max(1,xp//100+1)

        # Active lottery
        active=None
        try:
            rows=db.execute("SELECT * FROM lotteries ORDER BY id DESC").fetchall()
            for r in rows:
                x=dict(r)
                if str(x.get("status","active")).lower() in ("active","open","live","running"):
                    active=_rh29_lottery_payload(db,r,uid) if "_rh29_lottery_payload" in globals() else x
                    break
        except Exception:
            active=None

        # Daily summary
        day_key=time.strftime("%Y-%m-%d",time.gmtime(now))
        daily_claimed=False
        streak=0
        try:
            daily_claimed=bool(db.execute(
                "SELECT 1 FROM daily_calendar_claims WHERE user_id=? AND day_key=?",
                (uid,day_key)
            ).fetchone())
            rows=db.execute(
                "SELECT day_key FROM daily_calendar_claims WHERE user_id=? ORDER BY claimed_at DESC LIMIT 14",
                (uid,)
            ).fetchall()
            keys={r["day_key"] for r in rows}
            for off in range(0,14):
                k=time.strftime("%Y-%m-%d",time.gmtime(now-off*86400))
                if k in keys:
                    streak+=1
                elif off==0:
                    continue
                else:
                    break
        except Exception:
            pass

        # Season
        season=None
        try:
            s=db.execute(
                "SELECT * FROM seasons WHERE active=1 AND starts_at<=? AND ends_at>? ORDER BY id DESC LIMIT 1",
                (now,now)
            ).fetchone()
            if s:
                p=db.execute(
                    "SELECT xp FROM season_progress WHERE season_id=? AND user_id=?",
                    (int(s["id"]),uid)
                ).fetchone()
                season_xp=int(p["xp"] or 0) if p else 0
                season={
                    "title":s["title"],
                    "subtitle":s["subtitle"],
                    "xp":season_xp,
                    "level":min(20,season_xp//100),
                    "seconds_left":max(0,int(s["ends_at"])-now)
                }
        except Exception:
            pass

        # Game center stats + game of day
        day_index=int(time.strftime("%j",time.gmtime(now)))
        game_keys=[
            "roulette","daily_case","slot","coin_flip","number_guess","scratch",
            "safe_crack","dice_duel","rps","treasure_grid","reaction"
        ]
        featured_game=game_keys[day_index % len(game_keys)]
        try:
            gs=db.execute(
                """
                SELECT COUNT(*) AS plays,COALESCE(SUM(reward),0) AS earned,COALESCE(MAX(reward),0) AS best
                FROM game_plays WHERE user_id=?
                """,(uid,)
            ).fetchone()
            game_stats={"plays":int(gs["plays"] or 0),"earned":int(gs["earned"] or 0),"best":int(gs["best"] or 0)}
        except Exception:
            game_stats={"plays":0,"earned":0,"best":0}

        # Tasks / missions
        try:
            tasks_total=int(db.execute("SELECT COUNT(*) FROM tasks WHERE active=1").fetchone()[0])
            tasks_done=int(db.execute("SELECT COUNT(*) FROM task_claims WHERE user_id=?",(uid,)).fetchone()[0])
        except Exception:
            tasks_total=0; tasks_done=0

        # Social
        try:
            followers=int(db.execute("SELECT COUNT(*) FROM social_follows WHERE followed_id=?",(uid,)).fetchone()[0])
            following=int(db.execute("SELECT COUNT(*) FROM social_follows WHERE follower_id=?",(uid,)).fetchone()[0])
        except Exception:
            followers=0; following=0

        return {
            "balance":balance,
            "xp":xp,
            "level":level,
            "streak":streak,
            "daily_claimed":daily_claimed,
            "active_lottery":active,
            "season":season,
            "featured_game":featured_game,
            "game_stats":game_stats,
            "tasks":{"done":tasks_done,"total":tasks_total},
            "social":{"followers":followers,"following":following}
        }




@app.get("/api/progression-v31")
async def progression_v31(
    x_telegram_init_data: str | None = Header(default=None),
):
    user=current_user(x_telegram_init_data)
    uid=int(user["id"])

    with connect_db() as db:
        u=db.execute("SELECT xp,total_earned,balance FROM users WHERE telegram_id=?",(uid,)).fetchone()
        if not u:
            raise HTTPException(404,"Користувача не знайдено")

        xp=int(u["xp"] or 0)
        level=max(1,xp//100+1)
        level_xp=xp%100
        next_xp=100-level_xp if level_xp else 100

        rewards=[
            {"level":2,"reward":20,"icon":"✦","title":"Starter Boost"},
            {"level":5,"reward":50,"icon":"🎁","title":"Milestone Drop"},
            {"level":10,"reward":100,"icon":"🏆","title":"Elite Reward"},
            {"level":15,"reward":150,"icon":"◈","title":"Veteran Reward"},
            {"level":20,"reward":250,"icon":"♛","title":"Master Reward"}
        ]
        for r in rewards:
            r["unlocked"]=level>=r["level"]

        return {
            "xp":xp,
            "level":level,
            "level_xp":level_xp,
            "next_xp":next_xp,
            "balance":int(u["balance"] or 0),
            "total_earned":int(u["total_earned"] or 0),
            "rewards":rewards
        }




def _rh32_metrics(db, uid):
    def scalar(sql,args=()):
        try:
            r=db.execute(sql,args).fetchone()
            return int((r[0] if r else 0) or 0)
        except Exception:
            return 0

    games_played=scalar("SELECT COUNT(*) FROM game_plays WHERE user_id=?",(uid,))
    game_earned=scalar("SELECT COALESCE(SUM(reward),0) FROM game_plays WHERE user_id=?",(uid,))
    tickets=scalar("SELECT COUNT(*) FROM lottery_tickets WHERE user_id=?",(uid,))
    lottery_wins=scalar("SELECT COUNT(*) FROM lotteries WHERE winner_id=? AND status='drawn'",(uid,))
    total_earned=scalar("SELECT total_earned FROM users WHERE telegram_id=?",(uid,))

    # Social count: prefer mutual follows, fall back to referrals_count.
    friends=0
    try:
        friends=scalar(
            """SELECT COUNT(*) FROM social_follows a
               WHERE a.follower_id=? AND EXISTS(
                 SELECT 1 FROM social_follows b
                 WHERE b.follower_id=a.followed_id AND b.followed_id=?
               )""",(uid,uid)
        )
    except Exception:
        friends=0
    if not friends:
        try:
            friends=scalar("SELECT referrals_count FROM users WHERE telegram_id=?",(uid,))
        except Exception:
            pass

    streak=0
    try:
        now=int(time.time())
        rows=db.execute(
            "SELECT day_key FROM daily_calendar_claims WHERE user_id=? ORDER BY claimed_at DESC LIMIT 45",
            (uid,)
        ).fetchall()
        keys={r["day_key"] for r in rows}
        for off in range(45):
            k=time.strftime("%Y-%m-%d",time.gmtime(now-off*86400))
            if k in keys:
                streak+=1
            elif off==0:
                continue
            else:
                break
    except Exception:
        streak=0

    return {
        "games_played":games_played,
        "game_earned":game_earned,
        "tickets":tickets,
        "lottery_wins":lottery_wins,
        "total_earned":total_earned,
        "friends":friends,
        "streak":streak
    }


@app.get("/api/achievements-v32")
async def achievements_v32(
    x_telegram_init_data: str | None = Header(default=None),
):
    user=current_user(x_telegram_init_data)
    uid=int(user["id"])

    with connect_db() as db:
        metrics=_rh32_metrics(db,uid)
        rows=db.execute(
            "SELECT * FROM achievements_v32 WHERE active=1 ORDER BY category,sort_order,id"
        ).fetchall()
        claims={r["achievement_key"] for r in db.execute(
            "SELECT achievement_key FROM achievement_claims_v32 WHERE user_id=?",(uid,)
        ).fetchall()}

        items=[]
        for r in rows:
            value=int(metrics.get(r["metric"],0))
            goal=max(1,int(r["goal"] or 1))
            unlocked=value>=goal
            hidden=bool(r["hidden"])

            items.append({
                "key":r["achievement_key"],
                "category":r["category"],
                "title":("Секретне досягнення" if hidden and not unlocked else r["title"]),
                "description":("Виконай приховану умову" if hidden and not unlocked else r["description"]),
                "icon":("❓" if hidden and not unlocked else r["icon"]),
                "rarity":r["rarity"],
                "metric":r["metric"],
                "goal":goal,
                "value":value,
                "progress":min(100,round(value/goal*100)),
                "reward_rh":int(r["reward_rh"] or 0),
                "hidden":hidden,
                "unlocked":unlocked,
                "claimed":r["achievement_key"] in claims
            })

        unlocked_count=sum(1 for x in items if x["unlocked"])
        claimed_count=sum(1 for x in items if x["claimed"])

        return {
            "metrics":metrics,
            "items":items,
            "summary":{
                "total":len(items),
                "unlocked":unlocked_count,
                "claimed":claimed_count
            }
        }


@app.post("/api/achievements-v32/claim/{achievement_key}")
async def achievements_v32_claim(
    achievement_key: str,
    x_telegram_init_data: str | None = Header(default=None),
):
    user=current_user(x_telegram_init_data)
    uid=int(user["id"])
    now=int(time.time())

    with connect_db() as db:
        db.execute("BEGIN IMMEDIATE")
        row=db.execute(
            "SELECT * FROM achievements_v32 WHERE achievement_key=? AND active=1",
            (achievement_key,)
        ).fetchone()
        if not row:
            db.rollback()
            raise HTTPException(404,"Досягнення не знайдено")

        if db.execute(
            "SELECT 1 FROM achievement_claims_v32 WHERE user_id=? AND achievement_key=?",
            (uid,achievement_key)
        ).fetchone():
            db.rollback()
            raise HTTPException(409,"Нагороду вже отримано")

        metrics=_rh32_metrics(db,uid)
        value=int(metrics.get(row["metric"],0))
        goal=max(1,int(row["goal"] or 1))
        if value<goal:
            db.rollback()
            raise HTTPException(409,"Досягнення ще не виконано")

        reward=int(row["reward_rh"] or 0)
        db.execute(
            """
            INSERT INTO achievement_claims_v32(user_id,achievement_key,claimed_at,reward_rh)
            VALUES(?,?,?,?)
            """,(uid,achievement_key,now,reward)
        )
        if reward:
            db.execute(
                "UPDATE users SET balance=balance+?,total_earned=total_earned+? WHERE telegram_id=?",
                (reward,reward,uid)
            )
            try:
                db.execute(
                    "INSERT INTO ledger(user_id,amount,note,created_at) VALUES(?,?,?,?)",
                    (uid,reward,f"Achievement: {row['title']}",now)
                )
            except Exception:
                pass
        db.commit()

        bal=db.execute("SELECT balance FROM users WHERE telegram_id=?",(uid,)).fetchone()
        balance=int((bal[0] if bal else 0) or 0)

    return {"ok":True,"reward":reward,"balance":balance}




@app.get("/api/reward-center-v33")
async def reward_center_v33(
    x_telegram_init_data: str | None = Header(default=None),
):
    user=current_user(x_telegram_init_data)
    uid=int(user["id"])
    now=int(time.time())

    with connect_db() as db:
        u=db.execute("SELECT * FROM users WHERE telegram_id=?",(uid,)).fetchone()
        if not u:
            raise HTTPException(404,"Користувача не знайдено")

        balance=int(u["balance"] or 0) if "balance" in u.keys() else 0

        # Achievement rewards ready to claim
        achievements=[]
        try:
            metrics=_rh32_metrics(db,uid)
            claimed={r["achievement_key"] for r in db.execute(
                "SELECT achievement_key FROM achievement_claims_v32 WHERE user_id=?",(uid,)
            ).fetchall()}
            for r in db.execute(
                "SELECT * FROM achievements_v32 WHERE active=1 ORDER BY sort_order,id"
            ).fetchall():
                value=int(metrics.get(r["metric"],0))
                if value>=int(r["goal"] or 1) and r["achievement_key"] not in claimed:
                    achievements.append({
                        "key":r["achievement_key"],
                        "title":r["title"],
                        "icon":r["icon"],
                        "reward":int(r["reward_rh"] or 0),
                        "rarity":r["rarity"]
                    })
        except Exception:
            pass

        # Daily state
        daily={"ready":False,"streak":0}
        try:
            day_key=time.strftime("%Y-%m-%d",time.gmtime(now))
            daily["ready"]=not bool(db.execute(
                "SELECT 1 FROM daily_calendar_claims WHERE user_id=? AND day_key=?",
                (uid,day_key)
            ).fetchone())
            keys={r["day_key"] for r in db.execute(
                "SELECT day_key FROM daily_calendar_claims WHERE user_id=? ORDER BY claimed_at DESC LIMIT 45",
                (uid,)
            ).fetchall()}
            for off in range(45):
                k=time.strftime("%Y-%m-%d",time.gmtime(now-off*86400))
                if k in keys: daily["streak"]+=1
                elif off==0: continue
                else: break
        except Exception:
            pass

        # Season summary
        season=None
        try:
            s=db.execute(
                "SELECT * FROM seasons WHERE active=1 AND starts_at<=? AND ends_at>? ORDER BY id DESC LIMIT 1",
                (now,now)
            ).fetchone()
            if s:
                p=db.execute(
                    "SELECT xp FROM season_progress WHERE season_id=? AND user_id=?",
                    (int(s["id"]),uid)
                ).fetchone()
                sxp=int(p["xp"] or 0) if p else 0
                season={"title":s["title"],"xp":sxp,"level":min(20,sxp//100)}
        except Exception:
            pass

        # Lottery tickets / current draw
        lottery=None
        try:
            rows=db.execute("SELECT * FROM lotteries ORDER BY id DESC").fetchall()
            for r in rows:
                x=dict(r)
                if str(x.get("status","")).lower() in ("active","open","live","running"):
                    lottery=_rh29_lottery_payload(db,r,uid) if "_rh29_lottery_payload" in globals() else x
                    break
        except Exception:
            pass

        return {
            "balance":balance,
            "ready_count":len(achievements)+(1 if daily["ready"] else 0),
            "achievements":achievements,
            "daily":daily,
            "season":season,
            "lottery":lottery
        }




@app.get("/api/arcade-v34")
async def arcade_v34(
    x_telegram_init_data: str | None = Header(default=None),
):
    user=current_user(x_telegram_init_data)
    uid=int(user["id"])
    now=int(time.time())
    day_key=time.strftime("%Y-%m-%d",time.gmtime(now))

    challenges=[
        {"key":"play5","title":"Warm Up","description":"Зіграй 5 раундів сьогодні","goal":5,"reward":15,"metric":"plays"},
        {"key":"earn50","title":"RH Rush","description":"Зароби 50 RH сьогодні","goal":50,"reward":25,"metric":"earned"},
        {"key":"win3","title":"Lucky Streak","description":"Отримай нагороду у 3 раундах","goal":3,"reward":20,"metric":"wins"},
    ]

    with connect_db() as db:
        start=int(time.mktime(time.strptime(day_key,"%Y-%m-%d")))
        try:
            plays=int(db.execute(
                "SELECT COUNT(*) FROM game_plays WHERE user_id=? AND created_at>=?",
                (uid,start)
            ).fetchone()[0] or 0)
            earned=int(db.execute(
                "SELECT COALESCE(SUM(reward),0) FROM game_plays WHERE user_id=? AND created_at>=?",
                (uid,start)
            ).fetchone()[0] or 0)
            wins=int(db.execute(
                "SELECT COUNT(*) FROM game_plays WHERE user_id=? AND created_at>=? AND reward>0",
                (uid,start)
            ).fetchone()[0] or 0)
        except Exception:
            plays=earned=wins=0

        claimed={r["challenge_key"] for r in db.execute(
            "SELECT challenge_key FROM arcade_challenge_claims_v34 WHERE user_id=? AND day_key=?",
            (uid,day_key)
        ).fetchall()}

    metrics={"plays":plays,"earned":earned,"wins":wins}
    result=[]
    for c in challenges:
        value=int(metrics.get(c["metric"],0))
        result.append({
            **c,
            "value":value,
            "progress":min(100,round(value/c["goal"]*100)),
            "ready":value>=c["goal"],
            "claimed":c["key"] in claimed
        })
    return {"day_key":day_key,"metrics":metrics,"challenges":result}


@app.post("/api/arcade-v34/claim/{challenge_key}")
async def arcade_v34_claim(
    challenge_key: str,
    x_telegram_init_data: str | None = Header(default=None),
):
    user=current_user(x_telegram_init_data)
    uid=int(user["id"])
    now=int(time.time())
    day_key=time.strftime("%Y-%m-%d",time.gmtime(now))
    definitions={
        "play5":("plays",5,15),
        "earn50":("earned",50,25),
        "win3":("wins",3,20),
    }
    if challenge_key not in definitions:
        raise HTTPException(404,"Виклик не знайдено")

    metric,goal,reward=definitions[challenge_key]
    start=int(time.mktime(time.strptime(day_key,"%Y-%m-%d")))

    with connect_db() as db:
        db.execute("BEGIN IMMEDIATE")
        if db.execute(
            "SELECT 1 FROM arcade_challenge_claims_v34 WHERE user_id=? AND day_key=? AND challenge_key=?",
            (uid,day_key,challenge_key)
        ).fetchone():
            db.rollback()
            raise HTTPException(409,"Нагороду вже отримано")

        if metric=="plays":
            value=int(db.execute("SELECT COUNT(*) FROM game_plays WHERE user_id=? AND created_at>=?",(uid,start)).fetchone()[0] or 0)
        elif metric=="earned":
            value=int(db.execute("SELECT COALESCE(SUM(reward),0) FROM game_plays WHERE user_id=? AND created_at>=?",(uid,start)).fetchone()[0] or 0)
        else:
            value=int(db.execute("SELECT COUNT(*) FROM game_plays WHERE user_id=? AND created_at>=? AND reward>0",(uid,start)).fetchone()[0] or 0)

        if value<goal:
            db.rollback()
            raise HTTPException(409,"Умову ще не виконано")

        db.execute(
            "INSERT INTO arcade_challenge_claims_v34(user_id,day_key,challenge_key,claimed_at,reward_rh) VALUES(?,?,?,?,?)",
            (uid,day_key,challenge_key,now,reward)
        )
        db.execute(
            "UPDATE users SET balance=balance+?,total_earned=total_earned+? WHERE telegram_id=?",
            (reward,reward,uid)
        )
        try:
            db.execute(
                "INSERT INTO ledger(user_id,amount,note,created_at) VALUES(?,?,?,?)",
                (uid,reward,f"Arcade Challenge {challenge_key}",now)
            )
        except Exception:
            pass
        db.commit()
        bal=int(db.execute("SELECT balance FROM users WHERE telegram_id=?",(uid,)).fetchone()[0] or 0)

    return {"ok":True,"reward":reward,"balance":bal}




@app.get("/api/journey-v35")
async def journey_v35(
    x_telegram_init_data: str | None = Header(default=None),
):
    user=current_user(x_telegram_init_data)
    uid=int(user["id"])

    with connect_db() as db:
        u=db.execute("SELECT * FROM users WHERE telegram_id=?",(uid,)).fetchone()
        if not u:
            raise HTTPException(404,"Користувача не знайдено")

        xp=int(u["xp"] or 0) if "xp" in u.keys() else 0
        level=max(1,xp//100+1)

        try:
            plays=int(db.execute("SELECT COUNT(*) FROM game_plays WHERE user_id=?",(uid,)).fetchone()[0] or 0)
        except Exception: plays=0
        try:
            tickets=int(db.execute("SELECT COUNT(*) FROM lottery_tickets WHERE user_id=?",(uid,)).fetchone()[0] or 0)
        except Exception: tickets=0
        try:
            ach=int(db.execute("SELECT COUNT(*) FROM achievement_claims_v32 WHERE user_id=?",(uid,)).fetchone()[0] or 0)
        except Exception: ach=0

        milestones=[
            {"id":"rookie","title":"Rookie","subtitle":"Початок шляху","icon":"✦","need":1,"metric":"level","reward":"Стартовий статус"},
            {"id":"player","title":"Player","subtitle":"10 ігор","icon":"🎮","need":10,"metric":"plays","reward":"Arcade badge"},
            {"id":"hunter","title":"Hunter","subtitle":"25 білетів","icon":"🎟️","need":25,"metric":"tickets","reward":"Lottery badge"},
            {"id":"achiever","title":"Achiever","subtitle":"5 досягнень","icon":"🏆","need":5,"metric":"ach","reward":"Profile title"},
            {"id":"elite","title":"Elite","subtitle":"10 рівень","icon":"◆","need":10,"metric":"level","reward":"Elite status"},
            {"id":"master","title":"Master","subtitle":"20 рівень","icon":"♛","need":20,"metric":"level","reward":"Master status"},
        ]
        metrics={"level":level,"plays":plays,"tickets":tickets,"ach":ach}
        for m in milestones:
            value=metrics[m["metric"]]
            m["value"]=value
            m["done"]=value>=m["need"]
            m["progress"]=min(100,round(value/max(1,m["need"])*100))

        done=sum(1 for m in milestones if m["done"])
        return {
            "level":level,"xp":xp,"plays":plays,"tickets":tickets,"achievements":ach,
            "done":done,"total":len(milestones),"milestones":milestones
        }




@app.get("/api/profile-v36")
async def profile_v36(
    x_telegram_init_data: str | None = Header(default=None),
):
    user=current_user(x_telegram_init_data)
    uid=int(user["id"])

    with connect_db() as db:
        u=db.execute("SELECT * FROM users WHERE telegram_id=?",(uid,)).fetchone()
        if not u:
            raise HTTPException(404,"Користувача не знайдено")

        def uv(name, default=0):
            return u[name] if name in u.keys() and u[name] is not None else default

        xp=int(uv("xp",0))
        level=max(1,xp//100+1)
        balance=int(uv("balance",0))
        total_earned=int(uv("total_earned",0))

        try:
            gs=db.execute("""
                SELECT COUNT(*) AS plays,
                       COALESCE(SUM(reward),0) AS earned,
                       COALESCE(MAX(reward),0) AS best
                FROM game_plays WHERE user_id=?
            """,(uid,)).fetchone()
            plays=int(gs["plays"] or 0)
            game_earned=int(gs["earned"] or 0)
            best_win=int(gs["best"] or 0)
        except Exception:
            plays=game_earned=best_win=0

        try:
            tickets=int(db.execute(
                "SELECT COUNT(*) FROM lottery_tickets WHERE user_id=?",(uid,)
            ).fetchone()[0] or 0)
        except Exception:
            tickets=0

        try:
            lottery_wins=int(db.execute(
                "SELECT COUNT(*) FROM lotteries WHERE winner_id=? AND status='drawn'",(uid,)
            ).fetchone()[0] or 0)
        except Exception:
            lottery_wins=0

        try:
            achievements=int(db.execute(
                "SELECT COUNT(*) FROM achievement_claims_v32 WHERE user_id=?",(uid,)
            ).fetchone()[0] or 0)
        except Exception:
            achievements=0

        try:
            followers=int(db.execute(
                "SELECT COUNT(*) FROM social_follows WHERE followed_id=?",(uid,)
            ).fetchone()[0] or 0)
            following=int(db.execute(
                "SELECT COUNT(*) FROM social_follows WHERE follower_id=?",(uid,)
            ).fetchone()[0] or 0)
        except Exception:
            followers=following=0

        # Cosmetic/profile data: normalize whichever columns exist in current build.
        frame=str(uv("active_frame",uv("profile_frame","default")))
        title=str(uv("active_title",uv("profile_title","Player")))
        background=str(uv("active_background",uv("profile_background","default")))

        # Rank is presentation only, calculated from level.
        if level>=20: rank=("MASTER","♛")
        elif level>=15: rank=("DIAMOND","◆")
        elif level>=10: rank=("ELITE","✦")
        elif level>=5: rank=("PRO","◈")
        else: rank=("ROOKIE","•")

        return {
            "id":uid,
            "username":str(user.get("username") or ""),
            "first_name":str(user.get("first_name") or "Player"),
            "balance":balance,
            "xp":xp,
            "level":level,
            "level_progress":xp%100,
            "total_earned":total_earned,
            "games":{"plays":plays,"earned":game_earned,"best":best_win},
            "lottery":{"tickets":tickets,"wins":lottery_wins},
            "achievements":achievements,
            "social":{"followers":followers,"following":following},
            "cosmetics":{"frame":frame,"title":title,"background":background},
            "rank":{"name":rank[0],"icon":rank[1]}
        }




def _rh37_public_profile(db, uid):
    u=db.execute("SELECT * FROM users WHERE telegram_id=?",(uid,)).fetchone()
    if not u:
        return None

    def uv(name, default=0):
        return u[name] if name in u.keys() and u[name] is not None else default

    xp=int(uv("xp",0))
    level=max(1,xp//100+1)
    try:
        achievements=int(db.execute(
            "SELECT COUNT(*) FROM achievement_claims_v32 WHERE user_id=?",(uid,)
        ).fetchone()[0] or 0)
    except Exception:
        achievements=0
    try:
        plays=int(db.execute(
            "SELECT COUNT(*) FROM game_plays WHERE user_id=?",(uid,)
        ).fetchone()[0] or 0)
    except Exception:
        plays=0
    try:
        wins=int(db.execute(
            "SELECT COUNT(*) FROM lotteries WHERE winner_id=? AND status='drawn'",(uid,)
        ).fetchone()[0] or 0)
    except Exception:
        wins=0

    if level>=20: rank=("MASTER","♛")
    elif level>=15: rank=("DIAMOND","◆")
    elif level>=10: rank=("ELITE","✦")
    elif level>=5: rank=("PRO","◈")
    else: rank=("ROOKIE","•")

    username=str(uv("username",""))
    first_name=str(uv("first_name","Player"))
    return {
        "id":uid,
        "username":username,
        "first_name":first_name,
        "level":level,
        "rank":{"name":rank[0],"icon":rank[1]},
        "title":str(uv("active_title",uv("profile_title","Player"))),
        "frame":str(uv("active_frame",uv("profile_frame","default"))),
        "background":str(uv("active_background",uv("profile_background","default"))),
        "achievements":achievements,
        "games":plays,
        "lottery_wins":wins
    }


@app.get("/api/community-v37")
async def community_v37(
    x_telegram_init_data: str | None = Header(default=None),
):
    user=current_user(x_telegram_init_data)
    uid=int(user["id"])
    now=int(time.time())

    with connect_db() as db:
        # Seed a few feed items from real existing data if the feed is empty.
        try:
            count=int(db.execute("SELECT COUNT(*) FROM activity_feed_v37").fetchone()[0] or 0)
            if count==0:
                recent=db.execute(
                    "SELECT telegram_id FROM users ORDER BY rowid DESC LIMIT 8"
                ).fetchall()
                for i,r in enumerate(recent):
                    db.execute(
                        "INSERT INTO activity_feed_v37(user_id,kind,title,detail,icon,value,created_at) VALUES(?,?,?,?,?,?,?)",
                        (int(r["telegram_id"]),"joined","Новий гравець","приєднався до ReferHub","✦",0,now-i*420)
                    )
                db.commit()
        except Exception:
            pass

        feed=[]
        try:
            rows=db.execute(
                "SELECT * FROM activity_feed_v37 ORDER BY created_at DESC LIMIT 30"
            ).fetchall()
            for r in rows:
                p=_rh37_public_profile(db,int(r["user_id"]))
                if not p: continue
                feed.append({
                    "id":int(r["id"]),
                    "kind":r["kind"],
                    "title":r["title"],
                    "detail":r["detail"],
                    "icon":r["icon"],
                    "value":int(r["value"] or 0),
                    "created_at":int(r["created_at"]),
                    "user":p
                })
        except Exception:
            pass

        players=[]
        try:
            rows=db.execute(
                "SELECT telegram_id FROM users ORDER BY xp DESC,total_earned DESC LIMIT 18"
            ).fetchall()
            for r in rows:
                p=_rh37_public_profile(db,int(r["telegram_id"]))
                if p: players.append(p)
        except Exception:
            pass

        following=set()
        try:
            following={int(r[0]) for r in db.execute(
                "SELECT followed_id FROM social_follows WHERE follower_id=?",(uid,)
            ).fetchall()}
        except Exception:
            pass

        for p in players:
            p["following"]=p["id"] in following
            p["self"]=p["id"]==uid

        return {"feed":feed,"players":players,"now":now}


@app.get("/api/public-profile-v37/{target_id}")
async def public_profile_v37(
    target_id: int,
    x_telegram_init_data: str | None = Header(default=None),
):
    user=current_user(x_telegram_init_data)
    uid=int(user["id"])
    with connect_db() as db:
        p=_rh37_public_profile(db,target_id)
        if not p:
            raise HTTPException(404,"Гравця не знайдено")
        try:
            p["followers"]=int(db.execute(
                "SELECT COUNT(*) FROM social_follows WHERE followed_id=?",(target_id,)
            ).fetchone()[0] or 0)
            p["following_count"]=int(db.execute(
                "SELECT COUNT(*) FROM social_follows WHERE follower_id=?",(target_id,)
            ).fetchone()[0] or 0)
            p["is_following"]=bool(db.execute(
                "SELECT 1 FROM social_follows WHERE follower_id=? AND followed_id=?",(uid,target_id)
            ).fetchone())
        except Exception:
            p["followers"]=p["following_count"]=0
            p["is_following"]=False
        p["self"]=target_id==uid
        return p




def _rh38_score_rows(db, tournament, limit=20):
    game_key=tournament["game_key"]
    args=[int(tournament["starts_at"]),int(tournament["ends_at"])]
    where="g.created_at>=? AND g.created_at<?"
    if game_key!="all":
        where+=" AND g.game_key=?"
        args.append(game_key)

    rows=db.execute(
        f"""
        SELECT g.user_id,
               COUNT(*) AS plays,
               COALESCE(SUM(g.reward),0) AS score,
               COALESCE(MAX(g.reward),0) AS best,
               u.username,u.first_name
        FROM game_plays g
        JOIN users u ON u.telegram_id=g.user_id
        WHERE {where}
        GROUP BY g.user_id,u.username,u.first_name
        ORDER BY score DESC,plays DESC,best DESC
        LIMIT ?
        """,
        tuple(args+[limit])
    ).fetchall()
    return rows


@app.get("/api/tournaments-v38")
async def tournaments_v38(
    x_telegram_init_data: str | None = Header(default=None),
):
    user=current_user(x_telegram_init_data)
    uid=int(user["id"])
    now=int(time.time())

    with connect_db() as db:
        rows=db.execute(
            """
            SELECT * FROM tournaments_v38
            WHERE active=1
            ORDER BY ends_at ASC,id ASC
            """
        ).fetchall()

        items=[]
        for t in rows:
            leaders=_rh38_score_rows(db,t,5)
            my_score=0
            my_place=None
            top=[]
            for i,r in enumerate(leaders,1):
                top.append({
                    "place":i,
                    "id":int(r["user_id"]),
                    "username":r["username"],
                    "first_name":r["first_name"],
                    "score":int(r["score"] or 0),
                    "plays":int(r["plays"] or 0),
                    "best":int(r["best"] or 0)
                })

            all_rows=_rh38_score_rows(db,t,100)
            for i,r in enumerate(all_rows,1):
                if int(r["user_id"])==uid:
                    my_score=int(r["score"] or 0)
                    my_place=i
                    break

            items.append({
                "id":int(t["id"]),
                "key":t["tournament_key"],
                "title":t["title"],
                "subtitle":t["subtitle"],
                "game_key":t["game_key"],
                "icon":t["icon"],
                "starts_at":int(t["starts_at"]),
                "ends_at":int(t["ends_at"]),
                "seconds_left":max(0,int(t["ends_at"])-now),
                "status":"live" if int(t["starts_at"])<=now<int(t["ends_at"]) else ("upcoming" if now<int(t["starts_at"]) else "ended"),
                "prizes":[int(t["prize_1"]),int(t["prize_2"]),int(t["prize_3"])],
                "my_score":my_score,
                "my_place":my_place,
                "leaders":top
            })

    return {"items":items}


@app.get("/api/tournaments-v38/{tournament_id}")
async def tournament_v38_detail(
    tournament_id: int,
    x_telegram_init_data: str | None = Header(default=None),
):
    user=current_user(x_telegram_init_data)
    uid=int(user["id"])
    now=int(time.time())

    with connect_db() as db:
        t=db.execute(
            "SELECT * FROM tournaments_v38 WHERE id=? AND active=1",
            (tournament_id,)
        ).fetchone()
        if not t:
            raise HTTPException(404,"Турнір не знайдено")

        rows=_rh38_score_rows(db,t,50)
        leaderboard=[]
        my_place=None
        my_score=0

        for i,r in enumerate(rows,1):
            item={
                "place":i,
                "id":int(r["user_id"]),
                "username":r["username"],
                "first_name":r["first_name"],
                "score":int(r["score"] or 0),
                "plays":int(r["plays"] or 0),
                "best":int(r["best"] or 0),
                "self":int(r["user_id"])==uid
            }
            leaderboard.append(item)
            if item["self"]:
                my_place=i
                my_score=item["score"]

        return {
            "id":int(t["id"]),
            "title":t["title"],
            "subtitle":t["subtitle"],
            "game_key":t["game_key"],
            "icon":t["icon"],
            "seconds_left":max(0,int(t["ends_at"])-now),
            "status":"live" if int(t["starts_at"])<=now<int(t["ends_at"]) else ("upcoming" if now<int(t["starts_at"]) else "ended"),
            "prizes":[int(t["prize_1"]),int(t["prize_2"]),int(t["prize_3"])],
            "leaderboard":leaderboard,
            "my_place":my_place,
            "my_score":my_score
        }



@app.get("/health")
async def health():
    token = runtime_bot_token()
    url = runtime_webapp_url()
    source = "BOT_TOKEN" if (os.getenv("BOT_TOKEN") or "").strip() else (
        "TELEGRAM_BOT_TOKEN" if (os.getenv("TELEGRAM_BOT_TOKEN") or "").strip() else "none"
    )
    return {
        "ok": True,
        "bot_token_configured": bool(token),
        "bot_token_source": source,
        "bot_token_length": len(token),
        "webapp_url_configured": bool(url),
        "webapp_url": url if url else "",
        "bot_username": BOT_USERNAME,
        "data_dir": str(DATA_DIR),
    }


@app.get("/api/me")
async def api_me(x_telegram_init_data: str | None = Header(default=None)):
    user = current_user(x_telegram_init_data)
    return get_profile(int(user["id"]))


@app.get("/api/profile-pro")
async def profile_pro(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])
    now = int(time.time())
    day = 86400
    start_14_days = now - 13 * day

    with connect_db() as db:
        profile_row = db.execute(
            "SELECT * FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()

        tasks_completed = db.execute(
            "SELECT COUNT(*) FROM task_claims WHERE user_id = ?",
            (user_id,),
        ).fetchone()[0]

        games_played = db.execute(
            "SELECT COUNT(*) FROM game_plays WHERE user_id = ?",
            (user_id,),
        ).fetchone()[0]

        games_won = db.execute(
            "SELECT COUNT(*) FROM game_plays WHERE user_id = ? AND reward > 0",
            (user_id,),
        ).fetchone()[0]

        game_rewards = db.execute(
            "SELECT COALESCE(SUM(reward), 0) FROM game_plays WHERE user_id = ?",
            (user_id,),
        ).fetchone()[0]

        orders_count = db.execute(
            "SELECT COUNT(*) FROM gift_orders WHERE user_id = ?",
            (user_id,),
        ).fetchone()[0]

        tournaments_count = db.execute(
            "SELECT COUNT(*) FROM tournament_scores WHERE user_id = ?",
            (user_id,),
        ).fetchone()[0]

        best_tournament_place = db.execute(
            "SELECT MIN(place) FROM tournament_results WHERE user_id = ?",
            (user_id,),
        ).fetchone()[0]

        achievements = db.execute(
            """
            SELECT achievements.id, achievements.title,
                   achievements.icon, achievements.description,
                   user_achievements.claimed,
                   user_achievements.unlocked_at
            FROM user_achievements
            JOIN achievements
              ON achievements.id = user_achievements.achievement_id
            WHERE user_achievements.user_id = ?
            ORDER BY user_achievements.unlocked_at DESC
            """,
            (user_id,),
        ).fetchall()

        activity_rows = db.execute(
            """
            SELECT date(created_at, 'unixepoch') AS activity_day,
                   COUNT(*) AS actions,
                   COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS earned
            FROM ledger
            WHERE user_id = ? AND created_at >= ?
            GROUP BY activity_day
            """,
            (user_id, start_14_days),
        ).fetchall()

        activity_map = {
            row["activity_day"]: {
                "actions": row["actions"],
                "earned": row["earned"],
            }
            for row in activity_rows
        }

        activity = []
        for offset in range(13, -1, -1):
            timestamp = now - offset * day
            key = time.strftime("%Y-%m-%d", time.gmtime(timestamp))
            item = activity_map.get(key, {"actions": 0, "earned": 0})
            activity.append({
                "date": key,
                "label": time.strftime("%d.%m", time.gmtime(timestamp)),
                **item,
            })

        favorite = None
        if profile_row["featured_achievement_id"]:
            favorite_row = db.execute(
                """
                SELECT achievements.id, achievements.title,
                       achievements.icon, achievements.description
                FROM achievements
                JOIN user_achievements
                  ON user_achievements.achievement_id = achievements.id
                WHERE achievements.id = ?
                  AND user_achievements.user_id = ?
                """,
                (
                    profile_row["featured_achievement_id"],
                    user_id,
                ),
            ).fetchone()
            if favorite_row:
                favorite = dict(favorite_row)

        account_age_days = max(
            1,
            (now - profile_row["created_at"]) // day + 1,
        )

    return {
        "tasks_completed": tasks_completed,
        "games_played": games_played,
        "games_won": games_won,
        "win_rate": round(games_won * 100 / games_played) if games_played else 0,
        "game_rewards": game_rewards,
        "orders_count": orders_count,
        "tournaments_count": tournaments_count,
        "best_tournament_place": best_tournament_place,
        "account_age_days": account_age_days,
        "activity": activity,
        "unlocked_achievements": [dict(row) for row in achievements],
        "favorite_achievement": favorite,
        "available_frames": [

            {"key": "violet", "name": "Violet Core", "min_level": 1},
            {"key": "horned", "name": "Demon Horns", "min_level": 2},
            {"key": "angel", "name": "Celestial Wings", "min_level": 3},
            {"key": "tree", "name": "Ancient Tree", "min_level": 4},
            {"key": "crown", "name": "Royal Crown", "min_level": 5},
            {"key": "dragon", "name": "Dragon Coil", "min_level": 6},
            {"key": "frost", "name": "Frozen King", "min_level": 7},
            {"key": "thunder", "name": "Thunder God", "min_level": 8},
            {"key": "necromancer", "name": "Necromancer", "min_level": 9},
            {"key": "sakura", "name": "Sakura Spirit", "min_level": 10},
            {"key": "galaxy", "name": "Galaxy Orbit", "min_level": 12},
            {"key": "phoenix", "name": "Phoenix Rise", "min_level": 14},
            {"key": "raven", "name": "Raven Lord", "min_level": 16},
            {"key": "mythic", "name": "Mythic Throne", "min_level": 18},
            {"key": "founder", "name": "Founder Artifact", "min_level": 20}
        ],
    }


@app.patch("/api/profile-pro/style")
async def update_profile_style(
    payload: ProfileStylePayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    allowed_frames = {
        "violet": 1,
        "cyan": 2,
        "gold": 4,
        "inferno": 5,
    }

    with connect_db() as db:
        row = db.execute(
            "SELECT xp FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()
        current_level = level_info(row["xp"])["number"]

        if payload.frame is not None:
            if payload.frame not in allowed_frames:
                raise HTTPException(400, "Невідома рамка профілю")
            if current_level < allowed_frames[payload.frame]:
                raise HTTPException(
                    400,
                    f"Рамка відкривається на {allowed_frames[payload.frame]} рівні",
                )
            db.execute(
                "UPDATE users SET profile_frame = ? WHERE telegram_id = ?",
                (payload.frame, user_id),
            )

        if payload.featured_achievement_id is not None:
            unlocked = db.execute(
                """
                SELECT 1 FROM user_achievements
                WHERE user_id = ? AND achievement_id = ?
                """,
                (user_id, payload.featured_achievement_id),
            ).fetchone()
            if not unlocked:
                raise HTTPException(400, "Це досягнення ще не відкрито")
            db.execute(
                """
                UPDATE users
                SET featured_achievement_id = ?
                WHERE telegram_id = ?
                """,
                (payload.featured_achievement_id, user_id),
            )

        db.commit()

    return {"ok": True}




@app.get("/api/tasks")
async def api_tasks(x_telegram_init_data: str | None = Header(default=None)):
    user = current_user(x_telegram_init_data)

    with connect_db() as db:
        rows = db.execute(
            """
            SELECT tasks.*,
                   CASE WHEN task_claims.id IS NULL THEN 0 ELSE 1 END AS claimed,
                   task_opens.opened_at
            FROM tasks
            LEFT JOIN task_claims
              ON task_claims.task_id = tasks.id
             AND task_claims.user_id = ?
            LEFT JOIN task_opens
              ON task_opens.task_id = tasks.id
             AND task_opens.user_id = ?
            WHERE tasks.is_active = 1
              AND (tasks.starts_at = 0 OR tasks.starts_at <= strftime('%s','now'))
              AND (tasks.ends_at = 0 OR tasks.ends_at >= strftime('%s','now'))
            ORDER BY tasks.sort_order DESC, tasks.id DESC
            """,
            (int(user["id"]), int(user["id"])),
        ).fetchall()

    result = []
    with connect_db() as db:
        for row in rows:
            item = dict(row)
            item["category_name"] = TASK_CATEGORIES.get(
                item["category"],
                item["category"],
            )
            item["claims_count"] = db.execute(
                "SELECT COUNT(*) FROM task_claims WHERE task_id = ?",
                (item["id"],),
            ).fetchone()[0]
            item["remaining_claims"] = (
                max(0, item["max_claims"] - item["claims_count"])
                if item["max_claims"]
                else None
            )
            result.append(item)

    return result


@app.post("/api/tasks/{task_id}/open")
async def open_task(
    task_id: int,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    with connect_db() as db:
        task = db.execute(
            "SELECT * FROM tasks WHERE id = ? AND is_active = 1",
            (task_id,),
        ).fetchone()
        if not task:
            raise HTTPException(404, "Завдання не знайдено")

        db.execute(
            """
            INSERT INTO task_opens(task_id, user_id, opened_at)
            VALUES (?, ?, ?)
            ON CONFLICT(task_id, user_id)
            DO UPDATE SET opened_at = excluded.opened_at
            """,
            (task_id, user_id, int(time.time())),
        )
        db.commit()

    return {
        "ok": True,
        "link": task["link"],
        "wait_seconds": task["wait_seconds"],
    }


@app.post("/api/tasks/{task_id}/claim")
async def claim_task(
    task_id: int,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    with connect_db() as db:
        task = db.execute(
            "SELECT * FROM tasks WHERE id = ? AND is_active = 1",
            (task_id,),
        ).fetchone()

        if not task:
            raise HTTPException(404, "Завдання не знайдено")

        available, availability_message = task_availability(db, task)
        if not available:
            db.execute(
                """
                INSERT INTO task_checks(task_id, user_id, success, message, checked_at)
                VALUES (?, ?, 0, ?, ?)
                """,
                (task_id, user_id, availability_message, int(time.time())),
            )
            db.commit()
            raise HTTPException(400, availability_message)

        claimed = db.execute(
            """
            SELECT id FROM task_claims
            WHERE task_id = ? AND user_id = ?
            """,
            (task_id, user_id),
        ).fetchone()
        if claimed:
            raise HTTPException(409, "Нагороду вже отримано")

        verified, message = await verify_task_completion(
            db,
            task,
            user_id,
        )
        db.execute(
            """
            INSERT INTO task_checks(task_id, user_id, success, message, checked_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                task_id,
                user_id,
                1 if verified else 0,
                message,
                int(time.time()),
            ),
        )

        if not verified:
            db.commit()
            raise HTTPException(400, message or "Завдання не виконано")

        try:
            db.execute(
                """
                INSERT INTO task_claims(task_id, user_id, claimed_at)
                VALUES (?, ?, ?)
                """,
                (task_id, user_id, int(time.time())),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(409, "Нагороду вже отримано")

        add_balance(
            db,
            user_id,
            task["reward"],
            f"Завдання: {task['title']}",
            task["xp_reward"],
        )
        add_mission_progress(db, user_id, "tasks", 1)
        add_mission_progress(db, user_id, "earned", task["reward"])
        add_tournament_score(db, user_id, task["reward"])
        unlock_achievements(db, user_id)
        db.commit()

        balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()[0]

    return {"reward": task["reward"], "balance": balance}


@app.post("/api/spin")
async def spin(x_telegram_init_data: str | None = Header(default=None)):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])
    now = int(time.time())

    with connect_db() as db:
        last = db.execute(
            """
            SELECT created_at FROM spins
            WHERE user_id = ?
            ORDER BY id DESC LIMIT 1
            """,
            (user_id,),
        ).fetchone()

        if last and last["created_at"] + 86400 > now:
            raise HTTPException(429, "Спроба ще не відновилася")

        rewards = [0, 1, 2, 3, 5, 10, 20]
        weights = [25, 24, 20, 14, 10, 5, 2]
        reward = random.choices(rewards, weights=weights, k=1)[0]

        db.execute(
            "INSERT INTO spins(user_id, reward, created_at) VALUES (?, ?, ?)",
            (user_id, reward, now),
        )

        if reward:
            add_balance(db, user_id, reward, "Щоденна рулетка")

        db.commit()

        balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()[0]

    return {"reward": reward, "balance": balance, "next_spin_in": 86400}


@app.post("/api/daily")
async def claim_daily(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])
    now = int(time.time())

    with connect_db() as db:
        last = db.execute(
            """
            SELECT streak, claimed_at
            FROM daily_claims
            WHERE user_id = ?
            ORDER BY id DESC LIMIT 1
            """,
            (user_id,),
        ).fetchone()

        if last and last["claimed_at"] + 86400 > now:
            raise HTTPException(429, "Щоденний бонус уже отримано")

        if last and now - last["claimed_at"] <= 172800:
            streak = min(last["streak"] + 1, 30)
        else:
            streak = 1

        reward = min(1 + streak // 3, 10)

        db.execute(
            """
            INSERT INTO daily_claims(user_id, reward, streak, claimed_at)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, reward, streak, now),
        )
        add_balance(
            db,
            user_id,
            reward,
            f"Щоденний бонус • день {streak}",
        )
        db.commit()

        balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()[0]

    return {
        "reward": reward,
        "streak": streak,
        "balance": balance,
        "next_in": 86400,
    }


@app.get("/api/friends")
async def friends(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    with connect_db() as db:
        rows = db.execute(
            """
            SELECT telegram_id, username, first_name,
                   total_earned, created_at, last_seen
            FROM users
            WHERE referrer_id = ?
            ORDER BY created_at DESC
            LIMIT 500
            """,
            (user_id,),
        ).fetchall()

        referral_earned = db.execute(
            """
            SELECT COALESCE(SUM(amount), 0)
            FROM referral_rewards
            WHERE referrer_id = ?
            """,
            (user_id,),
        ).fetchone()[0]

    now = int(time.time())
    result = []
    for row in rows:
        item = dict(row)
        item["is_online"] = now - int(item.get("last_seen") or 0) <= 300
        result.append(item)

    return result



@app.get("/api/leaderboard")
async def leaderboard(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    with connect_db() as db:
        rows = db.execute(
            """
            SELECT telegram_id, username, first_name,
                   balance, total_earned, referrals_count,
                   xp, last_seen, created_at
            FROM users
            ORDER BY total_earned DESC, balance DESC, referrals_count DESC
            LIMIT 100
            """
        ).fetchall()

    current_time = int(time.time())
    players = []
    my_rank = None

    for index, row in enumerate(rows, start=1):
        item = dict(row)
        item["rank"] = index
        item["level"] = level_info(int(item.get("xp") or 0))
        item["is_online"] = (
            current_time - int(item.get("last_seen") or 0) <= 300
        )
        item["is_me"] = int(item["telegram_id"]) == user_id
        item["league"] = (
            "Legend" if index <= 3 else
            "Diamond" if index <= 10 else
            "Platinum" if index <= 25 else
            "Gold" if index <= 50 else
            "Silver"
        )
        if item["is_me"]:
            my_rank = index
        players.append(item)

    return {
        "players": players,
        "my_rank": my_rank,
        "total_players": len(players),
    }


@app.get("/api/referrals/summary")
async def referral_summary(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    with connect_db() as db:
        profile = db.execute(
            """
            SELECT referrals_count
            FROM users
            WHERE telegram_id = ?
            """,
            (user_id,),
        ).fetchone()

        total_reward = db.execute(
            """
            SELECT COALESCE(SUM(amount), 0)
            FROM referral_rewards
            WHERE referrer_id = ?
            """,
            (user_id,),
        ).fetchone()[0]

        active_count = db.execute(
            """
            SELECT COUNT(*)
            FROM users
            WHERE referrer_id = ?
              AND last_seen >= ?
            """,
            (user_id, int(time.time()) - 7 * 86400),
        ).fetchone()[0]

    count = profile["referrals_count"] if profile else 0
    milestones = [
        {"count": 1, "label": "Перший друг"},
        {"count": 5, "label": "Команда"},
        {"count": 10, "label": "Амбасадор"},
        {"count": 25, "label": "Лідер"},
        {"count": 50, "label": "Легенда"},
    ]
    next_milestone = next(
        (milestone for milestone in milestones if count < milestone["count"]),
        None,
    )

    return {
        "referrals_count": count,
        "active_count": active_count,
        "total_reward": total_reward,
        "reward_per_friend": REFERRAL_REWARD,
        "referral_link": (
            f"https://t.me/{BOT_USERNAME}?start=ref_{user_id}"
        ),
        "next_milestone": next_milestone,
        "milestones": [
            {
                **milestone,
                "completed": count >= milestone["count"],
            }
            for milestone in milestones
        ],
    }


@app.get("/api/feed")
async def feed(
    x_telegram_init_data: str | None = Header(default=None),
):
    current_user(x_telegram_init_data)

    with connect_db() as db:
        rows = db.execute(
            """
            SELECT users.first_name, ledger.amount, ledger.note,
                   ledger.created_at
            FROM ledger
            JOIN users ON users.telegram_id = ledger.user_id
            WHERE ledger.amount > 0
            ORDER BY ledger.id DESC
            LIMIT 10
            """
        ).fetchall()

    return [dict(row) for row in rows]


@app.get("/api/admin/tasks")
async def admin_tasks(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))

    with connect_db() as db:
        rows = db.execute(
            """
            SELECT tasks.*,
                   COUNT(task_claims.id) AS claims_count
            FROM tasks
            LEFT JOIN task_claims ON task_claims.task_id = tasks.id
            GROUP BY tasks.id
            ORDER BY tasks.sort_order DESC, tasks.id DESC
            """
        ).fetchall()

    return [dict(row) for row in rows]


@app.get("/api/admin/telegram-channel/check")
async def admin_check_telegram_channel(
    chat_id: str,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))

    if not bot_app:
        raise HTTPException(400, "Telegram-бот не запущений. Перевір BOT_TOKEN.")

    try:
        normalized = normalize_telegram_chat_id(chat_id)
        chat = await bot_app.bot.get_chat(normalized)
        bot_user = await bot_app.bot.get_me()
        bot_member = await bot_app.bot.get_chat_member(
            chat_id=normalized,
            user_id=bot_user.id,
        )

        bot_status = bot_member.status
        can_check_members = bot_status in {"administrator", "creator"}

        return {
            "ok": True,
            "chat_id": chat.id,
            "title": chat.title or chat.username or str(chat.id),
            "username": chat.username,
            "type": chat.type,
            "bot_status": bot_status,
            "can_check_members": can_check_members,
            "message": (
                "Канал готовий до перевірки підписок"
                if can_check_members
                else "Додай бота адміністратором каналу"
            ),
        }
    except Exception as error:
        message = str(error)
        raise HTTPException(
            400,
            f"Не вдалося перевірити канал: {message[:180]}",
        )




@app.post("/api/admin/tasks")
async def admin_create_task(
    payload: TaskCreatePayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))

    if payload.category not in TASK_CATEGORIES:
        raise HTTPException(400, "Невідома категорія")

    allowed_verification = {
        "instant",
        "visit",
        "telegram_member",
        "referral",
    }
    if payload.verification_type not in allowed_verification:
        raise HTTPException(400, "Невідомий тип перевірки")

    with connect_db() as db:
        cursor = db.execute(
            """
            INSERT INTO tasks(
                title, description, reward, icon, link,
                category, verification_type, telegram_chat_id,
                wait_seconds, sort_order, max_claims,
                starts_at, ends_at, is_active, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            """,
            (
                payload.title,
                payload.description,
                payload.reward,
                payload.icon,
                payload.link,
                payload.category,
                payload.verification_type,
                payload.telegram_chat_id,
                payload.wait_seconds,
                payload.sort_order,
                payload.max_claims,
                payload.starts_at,
                payload.ends_at,
                int(time.time()),
            ),
        )
        db.commit()

    return {"ok": True, "id": cursor.lastrowid}


@app.patch("/api/admin/tasks/{task_id}")
async def admin_update_task(
    task_id: int,
    payload: TaskUpdatePayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))

    data = payload.model_dump(exclude_unset=True)
    if not data:
        return {"ok": True}

    allowed_fields = {
        "title",
        "description",
        "reward",
        "icon",
        "link",
        "category",
        "verification_type",
        "telegram_chat_id",
        "wait_seconds",
        "sort_order",
        "max_claims",
        "starts_at",
        "ends_at",
        "is_active",
    }

    fields = []
    values = []
    for key, value in data.items():
        if key not in allowed_fields:
            continue
        if key == "is_active":
            value = 1 if value else 0
        fields.append(f"{key} = ?")
        values.append(value)

    if not fields:
        return {"ok": True}

    values.append(task_id)

    with connect_db() as db:
        db.execute(
            f"UPDATE tasks SET {', '.join(fields)} WHERE id = ?",
            values,
        )
        db.commit()

    return {"ok": True}


@app.delete("/api/admin/tasks/{task_id}")
async def admin_delete_task(
    task_id: int,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))

    with connect_db() as db:
        db.execute(
            "UPDATE tasks SET is_active = 0 WHERE id = ?",
            (task_id,),
        )
        db.commit()

    return {"ok": True}


@app.get("/api/admin/tasks/{task_id}")
async def admin_task_detail(
    task_id: int,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))

    with connect_db() as db:
        task = db.execute(
            "SELECT * FROM tasks WHERE id = ?",
            (task_id,),
        ).fetchone()
        if not task:
            raise HTTPException(404, "Завдання не знайдено")

        data = dict(task)
        data["claims_count"] = db.execute(
            "SELECT COUNT(*) FROM task_claims WHERE task_id = ?",
            (task_id,),
        ).fetchone()[0]
        data["checks_count"] = db.execute(
            "SELECT COUNT(*) FROM task_checks WHERE task_id = ?",
            (task_id,),
        ).fetchone()[0]

    return data


@app.get("/api/admin/tasks/{task_id}/checks")
async def admin_task_checks(
    task_id: int,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))

    with connect_db() as db:
        rows = db.execute(
            """
            SELECT task_checks.*, users.first_name, users.username
            FROM task_checks
            LEFT JOIN users ON users.telegram_id = task_checks.user_id
            WHERE task_checks.task_id = ?
            ORDER BY task_checks.id DESC
            LIMIT 100
            """,
            (task_id,),
        ).fetchall()

    return [dict(row) for row in rows]


@app.post("/api/admin/tasks/{task_id}/restore")
async def admin_restore_task(
    task_id: int,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))

    with connect_db() as db:
        db.execute(
            "UPDATE tasks SET is_active = 1 WHERE id = ?",
            (task_id,),
        )
        db.commit()

    return {"ok": True}


@app.get("/api/admin/gifts")
async def admin_gifts(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))

    with connect_db() as db:
        rows = db.execute(
            """
            SELECT gifts.*,
                   COUNT(gift_orders.id) AS orders_count
            FROM gifts
            LEFT JOIN gift_orders ON gift_orders.gift_id = gifts.id
            GROUP BY gifts.id
            ORDER BY gifts.sort_order DESC, gifts.id DESC
            """
        ).fetchall()

    return [dict(row) for row in rows]


@app.post("/api/admin/gifts")
async def admin_create_gift(
    payload: GiftCreatePayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))

    with connect_db() as db:
        cursor = db.execute(
            """
            INSERT INTO gifts(
                title, description, price, emoji,
                stock, sort_order, is_active, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)
            """,
            (
                payload.title,
                payload.description,
                payload.price,
                payload.emoji,
                payload.stock,
                payload.sort_order,
                int(time.time()),
            ),
        )
        db.commit()

    return {"ok": True, "id": cursor.lastrowid}


@app.patch("/api/admin/gifts/{gift_id}")
async def admin_update_gift(
    gift_id: int,
    payload: GiftUpdatePayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))

    data = payload.model_dump(exclude_unset=True)
    if not data:
        return {"ok": True}

    fields = []
    values = []
    for key, value in data.items():
        if key == "is_active":
            value = 1 if value else 0
        fields.append(f"{key} = ?")
        values.append(value)

    values.append(gift_id)

    with connect_db() as db:
        db.execute(
            f"UPDATE gifts SET {', '.join(fields)} WHERE id = ?",
            values,
        )
        db.commit()

    return {"ok": True}


@app.get("/api/admin/orders")
async def admin_orders(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))

    with connect_db() as db:
        rows = db.execute(
            """
            SELECT gift_orders.*, gifts.title, gifts.emoji,
                   users.first_name, users.username,
                   (
                       SELECT COUNT(*)
                       FROM order_status_history
                       WHERE order_status_history.order_id = gift_orders.id
                   ) AS status_changes
            FROM gift_orders
            JOIN gifts ON gifts.id = gift_orders.gift_id
            JOIN users ON users.telegram_id = gift_orders.user_id
            ORDER BY
                CASE gift_orders.status
                    WHEN 'pending' THEN 0
                    WHEN 'completed' THEN 1
                    ELSE 2
                END,
                gift_orders.id DESC
            """
        ).fetchall()

    return [dict(row) for row in rows]


@app.patch("/api/admin/orders/{order_id}")
async def admin_update_order(
    order_id: int,
    payload: OrderStatusPayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    admin_id = int(user["id"])
    require_admin(admin_id)

    allowed = {"pending", "processing", "completed", "rejected"}
    if payload.status not in allowed:
        raise HTTPException(400, "Невідомий статус заявки")

    with connect_db() as db:
        order = db.execute(
            """
            SELECT gift_orders.*, gifts.title
            FROM gift_orders
            JOIN gifts ON gifts.id = gift_orders.gift_id
            WHERE gift_orders.id = ?
            """,
            (order_id,),
        ).fetchone()
        if not order:
            raise HTTPException(404, "Заявку не знайдено")

        old_status = order["status"]
        if old_status == payload.status:
            raise HTTPException(409, "Цей статус уже встановлено")

        if old_status in {"completed", "rejected"}:
            raise HTTPException(409, "Завершену заявку вже не можна змінити")

        if payload.status == "rejected":
            add_balance(
                db,
                order["user_id"],
                order["price"],
                f"Повернення за заявку #{order_id}",
            )
            db.execute(
                """
                UPDATE gifts
                SET stock = CASE WHEN stock > 0 THEN stock + 1 ELSE stock END
                WHERE id = ?
                """,
                (order["gift_id"],),
            )

        now = int(time.time())
        db.execute(
            """
            UPDATE gift_orders
            SET status = ?, admin_note = ?, updated_at = ?
            WHERE id = ?
            """,
            (payload.status, payload.admin_note, now, order_id),
        )
        db.execute(
            """
            INSERT INTO order_status_history(
                order_id, old_status, new_status,
                admin_id, note, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                order_id,
                old_status,
                payload.status,
                admin_id,
                payload.admin_note,
                now,
            ),
        )
        log_admin_action(
            db,
            admin_id,
            "order_status_changed",
            f"Заявка #{order_id}: {old_status} → {payload.status}",
            order["user_id"],
        )
        db.commit()

    notified = False
    if payload.notify_user:
        notified = await notify_order_user(
            order["user_id"],
            order_id,
            order["title"],
            payload.status,
            payload.admin_note,
        )

    return {"ok": True, "notified": notified}


@app.get("/api/admin/orders/{order_id}/history")
async def admin_order_history(
    order_id: int,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))

    with connect_db() as db:
        rows = db.execute(
            """
            SELECT order_status_history.*,
                   users.first_name AS admin_name,
                   users.username AS admin_username
            FROM order_status_history
            LEFT JOIN users
              ON users.telegram_id = order_status_history.admin_id
            WHERE order_status_history.order_id = ?
            ORDER BY order_status_history.id DESC
            """,
            (order_id,),
        ).fetchall()

    return [dict(row) for row in rows]


def log_admin_action(db, admin_id: int, action: str, details: str = "", target_user_id: int | None = None):
    db.execute(
        """
        INSERT INTO admin_action_logs(admin_id, target_user_id, action, details, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (admin_id, target_user_id, action, details, int(time.time())),
    )


@app.get("/api/admin/dashboard")
async def admin_dashboard(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))
    now = int(time.time())
    day_ago = now - 86400
    week_ago = now - 7 * 86400

    with connect_db() as db:
        total_users = db.execute(
            "SELECT COUNT(*) FROM users"
        ).fetchone()[0]

        active_today = db.execute(
            "SELECT COUNT(*) FROM users WHERE last_seen >= ?",
            (day_ago,),
        ).fetchone()[0]

        active_week = db.execute(
            "SELECT COUNT(*) FROM users WHERE last_seen >= ?",
            (week_ago,),
        ).fetchone()[0]

        banned_users = db.execute(
            "SELECT COUNT(*) FROM users WHERE is_banned = 1"
        ).fetchone()[0]

        total_balance = db.execute(
            "SELECT COALESCE(SUM(balance), 0) FROM users"
        ).fetchone()[0]

        issued_today = db.execute(
            """
            SELECT COALESCE(SUM(amount), 0)
            FROM ledger
            WHERE amount > 0 AND created_at >= ?
            """,
            (day_ago,),
        ).fetchone()[0]

        spent_today = abs(db.execute(
            """
            SELECT COALESCE(SUM(amount), 0)
            FROM ledger
            WHERE amount < 0 AND created_at >= ?
            """,
            (day_ago,),
        ).fetchone()[0])

        total_games = db.execute(
            "SELECT COUNT(*) FROM game_plays"
        ).fetchone()[0]

        pending_orders = db.execute(
            """
            SELECT COUNT(*) FROM gift_orders
            WHERE status IN ('new', 'pending', 'Нове', 'В обробці')
            """
        ).fetchone()[0]

        active_tasks = db.execute(
            "SELECT COUNT(*) FROM tasks WHERE is_active = 1"
        ).fetchone()[0]

        recent_users = db.execute(
            """
            SELECT telegram_id, username, first_name,
                   balance, xp, is_banned, last_seen, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 8
            """
        ).fetchall()

        recent_orders = db.execute(
            """
            SELECT gift_orders.id, gift_orders.user_id,
                   gift_orders.status, gift_orders.price,
                   gift_orders.created_at, gifts.title AS gift_title,
                   users.first_name
            FROM gift_orders
            LEFT JOIN gifts ON gifts.id = gift_orders.gift_id
            LEFT JOIN users ON users.telegram_id = gift_orders.user_id
            ORDER BY gift_orders.created_at DESC
            LIMIT 8
            """
        ).fetchall()

        game_stats = db.execute(
            """
            SELECT game_key, COUNT(*) AS plays,
                   COALESCE(SUM(reward), 0) AS rewards
            FROM game_plays
            GROUP BY game_key
            ORDER BY plays DESC
            """
        ).fetchall()

        ledger_days = db.execute(
            """
            SELECT date(created_at, 'unixepoch') AS day,
                   COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS issued,
                   ABS(COALESCE(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END), 0)) AS spent
            FROM ledger
            WHERE created_at >= ?
            GROUP BY day
            ORDER BY day
            """,
            (week_ago,),
        ).fetchall()

    return {
        "total_users": total_users,
        "active_today": active_today,
        "active_week": active_week,
        "banned_users": banned_users,
        "total_balance": total_balance,
        "issued_today": issued_today,
        "spent_today": spent_today,
        "total_games": total_games,
        "pending_orders": pending_orders,
        "active_tasks": active_tasks,
        "recent_users": [dict(row) for row in recent_users],
        "recent_orders": [dict(row) for row in recent_orders],
        "game_stats": [dict(row) for row in game_stats],
        "ledger_days": [dict(row) for row in ledger_days],
    }




@app.get("/api/admin/users")
async def admin_users(
    q: str = "",
    limit: int = 100,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))

    limit = max(1, min(limit, 500))
    search = f"%{q.strip()}%"

    with connect_db() as db:
        rows = db.execute(
            """
            SELECT telegram_id, username, first_name, balance, xp,
                   total_earned, referrals_count, created_at,
                   last_seen, is_banned
            FROM users
            WHERE ? = ''
               OR CAST(telegram_id AS TEXT) LIKE ?
               OR COALESCE(username, '') LIKE ?
               OR COALESCE(first_name, '') LIKE ?
            ORDER BY last_seen DESC
            LIMIT ?
            """,
            (q.strip(), search, search, search, limit),
        ).fetchall()

    now = int(time.time())
    result = []
    for row in rows:
        item = dict(row)
        item["is_online"] = now - item["last_seen"] <= 300
        result.append(item)

    return result


@app.get("/api/admin/users/{user_id}")
async def admin_user_detail(
    user_id: int,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))

    with connect_db() as db:
        profile = db.execute(
            """
            SELECT telegram_id, username, first_name, balance, xp,
                   total_earned, referrals_count, referrer_id,
                   created_at, last_seen, is_banned
            FROM users
            WHERE telegram_id = ?
            """,
            (user_id,),
        ).fetchone()
        if not profile:
            raise HTTPException(404, "Користувача не знайдено")

        history = db.execute(
            """
            SELECT amount, note, created_at
            FROM ledger
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT 50
            """,
            (user_id,),
        ).fetchall()

        orders = db.execute(
            """
            SELECT gift_orders.id, gift_orders.price,
                   gift_orders.status, gift_orders.created_at,
                   gifts.title, gifts.emoji
            FROM gift_orders
            JOIN gifts ON gifts.id = gift_orders.gift_id
            WHERE gift_orders.user_id = ?
            ORDER BY gift_orders.id DESC
            LIMIT 50
            """,
            (user_id,),
        ).fetchall()

        achievements = db.execute(
            """
            SELECT achievements.id, achievements.title, achievements.icon,
                   achievements.reward, achievements.xp_reward,
                   CASE WHEN user_achievements.id IS NULL THEN 0 ELSE 1 END AS unlocked,
                   COALESCE(user_achievements.claimed, 0) AS claimed
            FROM achievements
            LEFT JOIN user_achievements
              ON user_achievements.achievement_id = achievements.id
             AND user_achievements.user_id = ?
            WHERE achievements.is_active = 1
            ORDER BY achievements.id
            """,
            (user_id,),
        ).fetchall()

    return {
        "profile": dict(profile),
        "history": [dict(row) for row in history],
        "orders": [dict(row) for row in orders],
        "achievements": [dict(row) for row in achievements],
    }


@app.post("/api/admin/users/{user_id}/balance")
async def admin_change_balance(
    user_id: int,
    payload: BalanceChangePayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    admin = current_user(x_telegram_init_data)
    admin_id = int(admin["id"])
    require_admin(admin_id)

    if payload.amount == 0:
        raise HTTPException(400, "Сума не може дорівнювати нулю")

    with connect_db() as db:
        target = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()
        if not target:
            raise HTTPException(404, "Користувача не знайдено")

        if target["balance"] + payload.amount < 0:
            raise HTTPException(400, "Баланс не може стати від’ємним")

        add_balance(
            db,
            user_id,
            payload.amount,
            payload.note or "Корекція адміністратором",
        )
        log_admin_action(
            db, admin_id, "balance_change",
            f"{payload.amount:+d} RH — {payload.note}", user_id,
        )
        db.commit()

        balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()[0]

    return {"ok": True, "balance": balance}


@app.patch("/api/admin/users/{user_id}/ban")
async def admin_ban_user(
    user_id: int,
    payload: UserBanPayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    admin = current_user(x_telegram_init_data)
    admin_id = int(admin["id"])
    require_admin(admin_id)

    if user_id == admin_id and payload.is_banned:
        raise HTTPException(400, "Не можна заблокувати самого себе")

    with connect_db() as db:
        updated = db.execute(
            "UPDATE users SET is_banned = ? WHERE telegram_id = ?",
            (1 if payload.is_banned else 0, user_id),
        )
        if updated.rowcount == 0:
            raise HTTPException(404, "Користувача не знайдено")
        log_admin_action(
            db, admin_id,
            "user_ban" if payload.is_banned else "user_unban",
            "Користувача заблоковано" if payload.is_banned else "Користувача розблоковано",
            user_id,
        )
        db.commit()

    return {"ok": True}


@app.post("/api/admin/users/{user_id}/xp")
async def admin_change_xp(
    user_id: int,
    payload: XPChangePayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    admin = current_user(x_telegram_init_data)
    admin_id = int(admin["id"])
    require_admin(admin_id)
    if payload.amount == 0:
        raise HTTPException(400, "Сума XP не може дорівнювати нулю")
    with connect_db() as db:
        target = db.execute("SELECT xp FROM users WHERE telegram_id = ?", (user_id,)).fetchone()
        if not target:
            raise HTTPException(404, "Користувача не знайдено")
        new_xp = target["xp"] + payload.amount
        if new_xp < 0:
            raise HTTPException(400, "XP не може бути від’ємним")
        db.execute("UPDATE users SET xp = ? WHERE telegram_id = ?", (new_xp, user_id))
        log_admin_action(db, admin_id, "xp_change", f"{payload.amount:+d} XP — {payload.note}", user_id)
        db.commit()
    return {"ok": True, "xp": new_xp, "level": level_info(new_xp)}


@app.post("/api/admin/users/{user_id}/level")
async def admin_set_level(
    user_id: int,
    payload: SetLevelPayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    admin = current_user(x_telegram_init_data)
    admin_id = int(admin["id"])
    require_admin(admin_id)
    new_xp = (payload.level - 1) * 100
    with connect_db() as db:
        updated = db.execute("UPDATE users SET xp = ? WHERE telegram_id = ?", (new_xp, user_id))
        if updated.rowcount == 0:
            raise HTTPException(404, "Користувача не знайдено")
        log_admin_action(db, admin_id, "level_set", f"Рівень {payload.level} — {payload.note}", user_id)
        db.commit()
    return {"ok": True, "xp": new_xp, "level": level_info(new_xp)}


@app.post("/api/admin/users/{user_id}/achievement")
async def admin_grant_achievement(
    user_id: int,
    payload: GrantAchievementPayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    admin = current_user(x_telegram_init_data)
    admin_id = int(admin["id"])
    require_admin(admin_id)
    with connect_db() as db:
        achievement = db.execute("SELECT * FROM achievements WHERE id = ? AND is_active = 1", (payload.achievement_id,)).fetchone()
        if not achievement:
            raise HTTPException(404, "Досягнення не знайдено")
        if not db.execute("SELECT 1 FROM users WHERE telegram_id = ?", (user_id,)).fetchone():
            raise HTTPException(404, "Користувача не знайдено")
        existing = db.execute("SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?", (user_id, payload.achievement_id)).fetchone()
        if existing:
            raise HTTPException(409, "Досягнення вже видано")
        claimed = 1 if payload.claim_reward else 0
        now = int(time.time())
        db.execute("""INSERT INTO user_achievements(user_id, achievement_id, claimed, unlocked_at, claimed_at) VALUES (?, ?, ?, ?, ?)""",
                   (user_id, payload.achievement_id, claimed, now, now if claimed else None))
        if payload.claim_reward:
            add_balance(db, user_id, achievement["reward"], f"Досягнення від адміністратора: {achievement['title']}", achievement["xp_reward"])
        log_admin_action(db, admin_id, "achievement_grant", f"{achievement['title']} (нагорода: {'так' if payload.claim_reward else 'ні'})", user_id)
        db.commit()
    return {"ok": True}


@app.get("/api/admin/logs")
async def admin_logs(
    limit: int = 100,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))
    limit = max(1, min(limit, 500))
    with connect_db() as db:
        rows = db.execute(
            """
            SELECT admin_action_logs.*,
                   admin.first_name AS admin_name,
                   target.first_name AS target_name
            FROM admin_action_logs
            LEFT JOIN users admin ON admin.telegram_id = admin_action_logs.admin_id
            LEFT JOIN users target ON target.telegram_id = admin_action_logs.target_user_id
            ORDER BY admin_action_logs.id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]


@app.get("/api/admin/referrals-top")
async def admin_referrals_top(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))

    with connect_db() as db:
        rows = db.execute(
            """
            SELECT telegram_id, username, first_name,
                   referrals_count,
                   COALESCE((
                       SELECT SUM(amount)
                       FROM referral_rewards
                       WHERE referrer_id = users.telegram_id
                   ), 0) AS referral_earned
            FROM users
            ORDER BY referrals_count DESC, referral_earned DESC
            LIMIT 100
            """
        ).fetchall()

    return [dict(row) for row in rows]


@app.get("/api/admin/dashboard")
async def admin_dashboard(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))

    now = int(time.time())
    day_ago = now - 86400
    week_ago = now - 7 * 86400

    with connect_db() as db:
        users = db.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        active_day = db.execute(
            "SELECT COUNT(*) FROM users WHERE last_seen >= ?",
            (day_ago,),
        ).fetchone()[0]
        active_week = db.execute(
            "SELECT COUNT(*) FROM users WHERE last_seen >= ?",
            (week_ago,),
        ).fetchone()[0]
        total_balance = db.execute(
            "SELECT COALESCE(SUM(balance),0) FROM users"
        ).fetchone()[0]
        total_earned = db.execute(
            "SELECT COALESCE(SUM(total_earned),0) FROM users"
        ).fetchone()[0]
        task_claims = db.execute(
            "SELECT COUNT(*) FROM task_claims"
        ).fetchone()[0]
        pending_orders = db.execute(
            "SELECT COUNT(*) FROM gift_orders WHERE status = 'pending'"
        ).fetchone()[0]
        completed_orders = db.execute(
            "SELECT COUNT(*) FROM gift_orders WHERE status = 'completed'"
        ).fetchone()[0]
        banned_users = db.execute(
            "SELECT COUNT(*) FROM users WHERE is_banned = 1"
        ).fetchone()[0]

    return {
        "users": users,
        "active_day": active_day,
        "active_week": active_week,
        "total_balance": total_balance,
        "total_earned": total_earned,
        "task_claims": task_claims,
        "pending_orders": pending_orders,
        "completed_orders": completed_orders,
        "banned_users": banned_users,
    }


@app.get("/api/admin/games")
async def admin_games(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))

    with connect_db() as db:
        rows = db.execute(
            """
            SELECT game_settings.*,
                   COUNT(game_plays.id) AS plays_count,
                   COALESCE(SUM(game_plays.bet), 0) AS total_bets,
                   COALESCE(SUM(game_plays.reward), 0) AS total_rewards
            FROM game_settings
            LEFT JOIN game_plays
              ON game_plays.game_key = game_settings.game_key
            GROUP BY game_settings.game_key
            ORDER BY game_settings.game_key
            """
        ).fetchall()

    result = []
    for row in rows:
        item = dict(row)
        item["config"] = json.loads(item.pop("config_json") or "{}")
        result.append(item)

    return result


@app.patch("/api/admin/games/{game_key}")
async def admin_update_game(
    game_key: str,
    payload: GameSettingsPayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))

    data = payload.model_dump(exclude_unset=True)
    if not data:
        return {"ok": True}

    if "config_json" in data:
        try:
            json.loads(data["config_json"])
        except json.JSONDecodeError:
            raise HTTPException(400, "config_json має бути валідним JSON")

    fields = []
    values = []
    for key, value in data.items():
        if key == "is_active":
            value = 1 if value else 0
        fields.append(f"{key} = ?")
        values.append(value)

    values.append(game_key)

    with connect_db() as db:
        updated = db.execute(
            f"""
            UPDATE game_settings
            SET {', '.join(fields)}
            WHERE game_key = ?
            """,
            values,
        )
        if updated.rowcount == 0:
            raise HTTPException(404, "Гру не знайдено")
        db.commit()

    return {"ok": True}


@app.get("/api/admin/summary")
async def admin_summary(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    if user_id not in ADMIN_IDS:
        raise HTTPException(403, "Немає доступу")

    with connect_db() as db:
        return {
            "users": db.execute("SELECT COUNT(*) FROM users").fetchone()[0],
            "online": db.execute(
                "SELECT COUNT(*) FROM users WHERE last_seen >= ?",
                (int(time.time()) - 300,),
            ).fetchone()[0],
            "tasks": db.execute(
                "SELECT COUNT(*) FROM tasks WHERE is_active = 1"
            ).fetchone()[0],
            "orders": db.execute(
                "SELECT COUNT(*) FROM gift_orders WHERE status = 'pending'"
            ).fetchone()[0],
            "balance_sum": db.execute(
                "SELECT COALESCE(SUM(balance), 0) FROM users"
            ).fetchone()[0],
        }


@app.get("/api/top")
async def top(x_telegram_init_data: str | None = Header(default=None)):
    current_user(x_telegram_init_data)

    with connect_db() as db:
        rows = db.execute(
            """
            SELECT telegram_id, username, first_name,
                   total_earned, referrals_count
            FROM users
            ORDER BY total_earned DESC, referrals_count DESC
            LIMIT 50
            """
        ).fetchall()

    return [dict(row) for row in rows]


@app.get("/api/gifts")
async def gifts(
    x_telegram_init_data: str | None = Header(default=None),
):
    current_user(x_telegram_init_data)

    with connect_db() as db:
        rows = db.execute(
            """
            SELECT *
            FROM gifts
            WHERE is_active = 1
              AND (stock = 0 OR stock > 0)
            ORDER BY is_featured DESC, sort_order DESC, id DESC
            """
        ).fetchall()

    return [dict(row) for row in rows]


@app.post("/api/gifts/{gift_id}/buy")
async def buy_gift(
    gift_id: int,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])
    now = int(time.time())

    with connect_db() as db:
        gift = db.execute(
            """
            SELECT *
            FROM gifts
            WHERE id = ? AND is_active = 1
            """,
            (gift_id,),
        ).fetchone()

        if not gift:
            raise HTTPException(404, "Товар не знайдено")

        if gift["stock"] < 0:
            raise HTTPException(400, "Некоректний залишок товару")

        balance_row = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()
        balance = balance_row["balance"] if balance_row else 0

        if balance < gift["price"]:
            raise HTTPException(400, "Недостатньо RH ⭐")

        pending = db.execute(
            """
            SELECT id FROM gift_orders
            WHERE user_id = ? AND gift_id = ? AND status = 'pending'
            """,
            (user_id, gift_id),
        ).fetchone()
        if pending:
            raise HTTPException(409, "У тебе вже є заявка на цей товар")

        if gift["stock"] > 0:
            updated = db.execute(
                """
                UPDATE gifts
                SET stock = stock - 1
                WHERE id = ? AND stock > 0
                """,
                (gift_id,),
            )
            if updated.rowcount == 0:
                raise HTTPException(409, "Товар закінчився")

        add_balance(
            db,
            user_id,
            -gift["price"],
            f"Покупка: {gift['title']}",
        )

        cursor = db.execute(
            """
            INSERT INTO gift_orders(
                user_id, gift_id, price, status,
                created_at, updated_at
            )
            VALUES (?, ?, ?, 'pending', ?, ?)
            """,
            (user_id, gift_id, gift["price"], now, now),
        )
        db.commit()

        new_balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()[0]

    return {
        "ok": True,
        "order_id": cursor.lastrowid,
        "balance": new_balance,
        "message": "Заявку створено",
    }


@app.post("/api/gifts/{gift_id}/buy-with-promo")
async def buy_gift_with_promo(
    gift_id: int,
    payload: dict,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])
    now = int(time.time())
    promo_text = str(payload.get("code", "")).strip()
    promo = None

    with connect_db() as db:
        gift = db.execute(
            "SELECT * FROM gifts WHERE id = ? AND is_active = 1",
            (gift_id,),
        ).fetchone()
        if not gift:
            raise HTTPException(404, "Товар не знайдено")

        final_price = gift["price"]
        if promo_text:
            promo = db.execute(
                """
                SELECT * FROM promo_codes
                WHERE UPPER(code) = UPPER(?)
                  AND is_active = 1
                  AND (expires_at = 0 OR expires_at >= ?)
                  AND (max_uses = 0 OR uses_count < max_uses)
                """,
                (promo_text, now),
            ).fetchone()
            if not promo:
                raise HTTPException(400, "Промокод недійсний")
            final_price = max(
                1,
                int(gift["price"] * (100 - promo["discount_percent"]) / 100),
            )

        balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()[0]
        if balance < final_price:
            raise HTTPException(400, "Недостатньо RH ⭐")

        if gift["stock"] > 0:
            if db.execute(
                "UPDATE gifts SET stock = stock - 1 WHERE id = ? AND stock > 0",
                (gift_id,),
            ).rowcount == 0:
                raise HTTPException(409, "Товар закінчився")

        add_balance(db, user_id, -final_price, f"Покупка: {gift['title']}")

        cursor = db.execute(
            """
            INSERT INTO gift_orders(
                user_id, gift_id, price, original_price,
                promo_code, status, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
            """,
            (
                user_id,
                gift_id,
                final_price,
                gift["price"],
                promo_text or None,
                now,
                now,
            ),
        )
        if promo:
            db.execute(
                "UPDATE promo_codes SET uses_count = uses_count + 1 WHERE id = ?",
                (promo["id"],),
            )
        db.commit()

        new_balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()[0]

    return {
        "ok": True,
        "order_id": cursor.lastrowid,
        "balance": new_balance,
        "final_price": final_price,
        "message": "Заявку створено",
    }




@app.get("/api/orders")
async def user_orders(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    with connect_db() as db:
        rows = db.execute(
            """
            SELECT gift_orders.*, gifts.title, gifts.emoji
            FROM gift_orders
            JOIN gifts ON gifts.id = gift_orders.gift_id
            WHERE gift_orders.user_id = ?
            ORDER BY gift_orders.id DESC
            """,
            (user_id,),
        ).fetchall()

    return [dict(row) for row in rows]


@app.get("/api/games")
async def games(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])
    now = int(time.time())
    today_start = now - (now % 86400)

    with connect_db() as db:
        settings = db.execute(
            """
            SELECT * FROM game_settings
            ORDER BY game_key
            """
        ).fetchall()

        result = []
        for row in settings:
            item = dict(row)
            item["config"] = json.loads(item.pop("config_json") or "{}")
            item["plays_today"] = db.execute(
                """
                SELECT COUNT(*) FROM game_plays
                WHERE user_id = ? AND game_key = ? AND created_at >= ?
                """,
                (user_id, item["game_key"], today_start),
            ).fetchone()[0]

            last = db.execute(
                """
                SELECT created_at FROM game_plays
                WHERE user_id = ? AND game_key = ?
                ORDER BY id DESC LIMIT 1
                """,
                (user_id, item["game_key"]),
            ).fetchone()

            item["cooldown_remaining"] = 0
            if last and item["cooldown_seconds"]:
                item["cooldown_remaining"] = max(
                    0,
                    last["created_at"]
                    + item["cooldown_seconds"]
                    - now,
                )

            result.append(item)

    return result


@app.post("/api/games/roulette")
async def play_roulette(
    payload: GamePlayPayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    with connect_db() as db:
        setting = get_game_setting(db, "roulette")
        game_access_check(db, user_id, setting)

        # IMPORTANT: order must match the real wheel image clockwise from 12 o'clock.
        sectors = [1, 2, 3, 4, 5, 5, 6, 7, 8, 9, 10, 15]
        weights = [11, 10, 10, 9, 10, 8, 8, 8, 7, 7, 6, 6]

        # Choose sector INDEX first. This makes visual result and reward identical.
        sector_index = int(weighted_choice(list(range(len(sectors))), weights))
        reward = int(sectors[sector_index])
        is_jackpot = reward == 15

        db.execute(
            """
            UPDATE users
            SET stars = stars + ?,
                last_seen = ?
            WHERE telegram_id = ?
            """,
            (reward, int(time.time()), user_id),
        )

        result_text = (
            f"⭐ ДЖЕКПОТ! +{reward} зірок"
            if is_jackpot
            else f"Рулетка: +{reward} зірок"
        )

        add_mission_progress(db, user_id, "games", 1)
        save_game_play(db, user_id, "roulette", 0, reward, result_text)
        db.commit()

        row = db.execute(
            "SELECT balance, stars FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()

    return {
        "ok": True,
        "reward": reward,
        "sector_index": sector_index,
        "stars": int(row["stars"]),
        "balance": int(row["balance"]),
        "is_jackpot": is_jackpot,
        "result_text": result_text,
    }


@app.post("/api/games/daily-case")
async def play_daily_case(
    payload: GamePlayPayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    with connect_db() as db:
        setting = get_game_setting(db, "daily_case")
        game_access_check(db, user_id, setting)
        config = json.loads(setting["config_json"] or "{}")

        reward = weighted_choice(
            config.get("rewards", [1, 2, 5]),
            config.get("weights", [60, 30, 10]),
        )
        result_text = f"Щоденний кейс: +{reward} RH ⭐"

        add_balance(db, user_id, reward, "Щоденний кейс", 5)
        add_mission_progress(db, user_id, "games", 1)
        add_mission_progress(db, user_id, "earned", reward)
        add_tournament_score(db, user_id, reward)
        save_game_play(
            db,
            user_id,
            "daily_case",
            0,
            reward,
            result_text,
        )
        db.commit()

        balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()[0]

    return {
        "ok": True,
        "reward": reward,
        "balance": balance,
        "result_text": result_text,
    }


@app.post("/api/games/slot")
async def play_slot(
    payload: GamePlayPayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    import random

    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])
    bet = payload.bet

    with connect_db() as db:
        setting = get_game_setting(db, "slot")
        game_access_check(db, user_id, setting)

        if bet < setting["min_bet"] or bet > setting["max_bet"]:
            raise HTTPException(
                400,
                f"Ставка від {setting['min_bet']} до {setting['max_bet']} RH ⭐",
            )

        balance_row = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()
        if not balance_row or balance_row["balance"] < bet:
            raise HTTPException(400, "Недостатньо RH ⭐")

        config = json.loads(setting["config_json"] or "{}")
        symbols = config.get(
            "symbols",
            ["🍒", "🍋", "🔔", "⭐", "💎"],
        )
        win_chance = float(config.get("win_chance", 0.24))
        roll = random.random()
        reward = 0

        if roll < win_chance * 0.12:
            symbol = random.choices(
                symbols,
                weights=[45, 28, 15, 9, 3],
                k=1,
            )[0]
            result = [symbol, symbol, symbol]
            multipliers = config.get(
                "triple_multipliers",
                {"🍒": 2, "🍋": 2.5, "🔔": 4, "⭐": 6, "💎": 10},
            )
            reward = int(bet * float(multipliers.get(symbol, 2)))
        elif roll < win_chance:
            pair = random.choice(symbols[:-1])
            other = random.choice([s for s in symbols if s != pair])
            result = random.choice([
                [pair, pair, other],
                [pair, other, pair],
                [other, pair, pair],
            ])
            reward = int(bet * float(config.get("double_multiplier", 1.2)))
        else:
            result = random.sample(symbols, 3)

        add_balance(
            db,
            user_id,
            -bet,
            "Ставка у слоті",
        )

        if reward:
            add_balance(db, user_id, reward, "Виграш у слоті", 2)
            add_mission_progress(db, user_id, "earned", reward)
            add_tournament_score(db, user_id, reward)
        add_mission_progress(db, user_id, "games", 1)
        unlock_achievements(db, user_id)

        result_text = f"{' '.join(result)} — виграш {reward} RH ⭐"
        save_game_play(
            db,
            user_id,
            "slot",
            bet,
            reward,
            result_text,
        )
        db.commit()

        balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()[0]

    return {
        "ok": True,
        "symbols": result,
        "reward": reward,
        "balance": balance,
        "result_text": result_text,
    }



@app.post("/api/games/coin-flip")
async def play_coin_flip(
    payload: CoinFlipPayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    import random

    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])
    choice = payload.choice.lower().strip()

    if choice not in {"heads", "tails"}:
        raise HTTPException(400, "Обери heads або tails")

    with connect_db() as db:
        setting = get_game_setting(db, "coin_flip")
        game_access_check(db, user_id, setting)

        if payload.bet < setting["min_bet"] or payload.bet > setting["max_bet"]:
            raise HTTPException(
                400,
                f"Ставка від {setting['min_bet']} до {setting['max_bet']} RH ⭐",
            )

        balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()[0]
        if balance < payload.bet:
            raise HTTPException(400, "Недостатньо RH ⭐")

        config = json.loads(setting["config_json"] or "{}")
        win = random.random() < float(config.get("win_chance", 0.46))
        result = choice if win else ("tails" if choice == "heads" else "heads")
        reward = int(payload.bet * float(config.get("multiplier", 1.85))) if win else 0

        add_balance(db, user_id, -payload.bet, "Ставка: Орел чи решка")
        if reward:
            add_balance(db, user_id, reward, "Виграш: Орел чи решка", 2)
            add_mission_progress(db, user_id, "earned", reward)
            add_tournament_score(db, user_id, reward)

        add_mission_progress(db, user_id, "games", 1)
        save_game_play(
            db,
            user_id,
            "coin_flip",
            payload.bet,
            reward,
            f"{'Орел' if result == 'heads' else 'Решка'} — {'виграш' if win else 'програш'}",
        )
        db.commit()
        new_balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()[0]

    return {
        "ok": True,
        "result": result,
        "win": win,
        "reward": reward,
        "balance": new_balance,
    }


@app.post("/api/games/number-guess")
async def play_number_guess(
    payload: NumberGuessPayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    import random

    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    with connect_db() as db:
        setting = get_game_setting(db, "number_guess")
        game_access_check(db, user_id, setting)
        config = json.loads(setting["config_json"] or "{}")

        minimum = int(config.get("min_number", 1))
        maximum = int(config.get("max_number", 5))
        if payload.number < minimum or payload.number > maximum:
            raise HTTPException(400, f"Обери число від {minimum} до {maximum}")

        answer = random.randint(minimum, maximum)
        win = payload.number == answer
        reward = int(config.get("reward", 8)) if win else 0

        if reward:
            add_balance(db, user_id, reward, "Виграш: Вгадай число", 4)
            add_mission_progress(db, user_id, "earned", reward)
            add_tournament_score(db, user_id, reward)

        add_mission_progress(db, user_id, "games", 1)
        save_game_play(
            db,
            user_id,
            "number_guess",
            0,
            reward,
            f"Твоє число {payload.number}, правильне {answer}",
        )
        db.commit()
        balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()[0]

    return {
        "ok": True,
        "answer": answer,
        "win": win,
        "reward": reward,
        "balance": balance,
    }


@app.post("/api/games/scratch")
async def play_scratch(
    payload: GamePlayPayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    with connect_db() as db:
        setting = get_game_setting(db, "scratch")
        game_access_check(db, user_id, setting)
        config = json.loads(setting["config_json"] or "{}")

        reward = weighted_choice(
            config.get("rewards", [0, 1, 2, 5]),
            config.get("weights", [45, 30, 20, 5]),
        )

        if reward:
            add_balance(db, user_id, reward, "Скретч-картка", 3)
            add_mission_progress(db, user_id, "earned", reward)
            add_tournament_score(db, user_id, reward)

        add_mission_progress(db, user_id, "games", 1)
        save_game_play(
            db,
            user_id,
            "scratch",
            0,
            reward,
            f"Скретч-картка: +{reward} RH ⭐",
        )
        db.commit()
        balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()[0]

    return {
        "ok": True,
        "reward": reward,
        "balance": balance,
    }


@app.post("/api/games/safe-crack")
async def play_safe_crack(
    payload: SafeCrackPayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    import random

    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    with connect_db() as db:
        setting = get_game_setting(db, "safe_crack")
        game_access_check(db, user_id, setting)
        config = json.loads(setting["config_json"] or "{}")

        maximum = int(config.get("range", 6))
        if payload.number < 1 or payload.number > maximum:
            raise HTTPException(400, f"Обери комірку від 1 до {maximum}")

        correct = random.randint(1, maximum)
        win = payload.number == correct
        reward = int(config.get("reward", 12)) if win else 0

        if reward:
            add_balance(db, user_id, reward, "Злам сейфа", 5)
            add_mission_progress(db, user_id, "earned", reward)
            add_tournament_score(db, user_id, reward)

        add_mission_progress(db, user_id, "games", 1)
        save_game_play(
            db,
            user_id,
            "safe_crack",
            0,
            reward,
            f"Обрано {payload.number}, код сейфа {correct}",
        )
        db.commit()
        balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()[0]

    return {
        "ok": True,
        "correct": correct,
        "win": win,
        "reward": reward,
        "balance": balance,
    }


@app.get("/api/games/history")
async def games_history(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    with connect_db() as db:
        rows = db.execute(
            """
            SELECT game_key, bet, reward, result_text, created_at
            FROM game_plays
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT 50
            """,
            (user_id,),
        ).fetchall()

    return [dict(row) for row in rows]




@app.get("/api/season")
async def season_data(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])
    now = int(time.time())

    with connect_db() as db:
        season = active_season(db)
        if not season:
            return {"active": False}

        progress = db.execute(
            """
            SELECT season_xp FROM season_progress
            WHERE season_id = ? AND user_id = ?
            """,
            (season["id"], user_id),
        ).fetchone()

        season_xp = progress["season_xp"] if progress else 0
        current_level = min(
            season["max_level"],
            season_xp // season["xp_per_level"] + 1,
        )
        level_progress = season_xp % season["xp_per_level"]

        rewards = db.execute(
            """
            SELECT season_rewards.*,
                   CASE WHEN season_reward_claims.id IS NULL THEN 0 ELSE 1 END AS claimed
            FROM season_rewards
            LEFT JOIN season_reward_claims
              ON season_reward_claims.reward_id = season_rewards.id
             AND season_reward_claims.user_id = ?
            WHERE season_rewards.season_id = ?
            ORDER BY season_rewards.level
            """,
            (user_id, season["id"]),
        ).fetchall()

        missions = db.execute(
            """
            SELECT season_missions.*,
                   COALESCE(season_mission_progress.progress, 0) AS progress,
                   COALESCE(season_mission_progress.claimed, 0) AS claimed
            FROM season_missions
            LEFT JOIN season_mission_progress
              ON season_mission_progress.mission_id = season_missions.id
             AND season_mission_progress.user_id = ?
             AND season_mission_progress.season_id = ?
            WHERE season_missions.season_id = ?
              AND season_missions.is_active = 1
            ORDER BY season_missions.id
            """,
            (user_id, season["id"], season["id"]),
        ).fetchall()

    return {
        "active": True,
        "season": dict(season),
        "season_xp": season_xp,
        "current_level": current_level,
        "level_progress": level_progress,
        "xp_per_level": season["xp_per_level"],
        "seconds_remaining": max(0, season["ends_at"] - now),
        "rewards": [dict(row) for row in rewards],
        "missions": [dict(row) for row in missions],
    }


@app.post("/api/season/missions/{mission_id}/claim")
async def claim_season_mission(
    mission_id: int,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    with connect_db() as db:
        season = active_season(db)
        if not season:
            raise HTTPException(400, "Активного сезону немає")

        mission = db.execute(
            """
            SELECT season_missions.*,
                   season_mission_progress.progress,
                   season_mission_progress.claimed
            FROM season_missions
            JOIN season_mission_progress
              ON season_mission_progress.mission_id = season_missions.id
            WHERE season_missions.id = ?
              AND season_mission_progress.user_id = ?
              AND season_mission_progress.season_id = ?
            """,
            (mission_id, user_id, season["id"]),
        ).fetchone()

        if not mission or mission["progress"] < mission["target_value"]:
            raise HTTPException(400, "Сезонну місію ще не виконано")
        if mission["claimed"]:
            raise HTTPException(409, "Сезонний XP вже отримано")

        db.execute(
            """
            UPDATE season_mission_progress
            SET claimed = 1
            WHERE season_id = ? AND user_id = ? AND mission_id = ?
            """,
            (season["id"], user_id, mission_id),
        )
        grant_season_xp(
            db,
            season["id"],
            user_id,
            mission["season_xp_reward"],
        )
        db.commit()

    return {
        "ok": True,
        "season_xp_reward": mission["season_xp_reward"],
    }



@app.post("/api/season/rewards/claim-all")
async def claim_all_season_rewards(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    with connect_db() as db:
        season = active_season(db)
        if not season:
            raise HTTPException(400, "Активного сезону немає")

        progress = db.execute(
            """
            SELECT season_xp FROM season_progress
            WHERE season_id = ? AND user_id = ?
            """,
            (season["id"], user_id),
        ).fetchone()
        season_xp = progress["season_xp"] if progress else 0
        current_level = min(
            season["max_level"],
            season_xp // season["xp_per_level"] + 1,
        )

        rewards = db.execute(
            """
            SELECT season_rewards.*
            FROM season_rewards
            LEFT JOIN season_reward_claims
              ON season_reward_claims.reward_id = season_rewards.id
             AND season_reward_claims.user_id = ?
            WHERE season_rewards.season_id = ?
              AND season_rewards.level <= ?
              AND season_reward_claims.id IS NULL
            ORDER BY season_rewards.level
            """,
            (user_id, season["id"], current_level),
        ).fetchall()

        if not rewards:
            raise HTTPException(409, "Немає доступних нагород")

        total_reward = sum(int(reward["reward_value"] or 0) for reward in rewards)
        claimed_at = int(time.time())
        db.executemany(
            """
            INSERT INTO season_reward_claims(
                season_id, user_id, reward_id, claimed_at
            ) VALUES (?, ?, ?, ?)
            """,
            [
                (season["id"], user_id, reward["id"], claimed_at)
                for reward in rewards
            ],
        )
        db.execute(
            """
            UPDATE users
            SET balance = balance + ?,
                total_earned = total_earned + ?
            WHERE telegram_id = ?
            """,
            (total_reward, total_reward, user_id),
        )
        balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()["balance"]
        db.commit()

    return {
        "ok": True,
        "claimed_count": len(rewards),
        "reward_value": total_reward,
        "balance": balance,
    }


@app.post("/api/season/rewards/{reward_id}/claim")
async def claim_season_reward(
    reward_id: int,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    with connect_db() as db:
        season = active_season(db)
        if not season:
            raise HTTPException(400, "Активного сезону немає")

        progress = db.execute(
            """
            SELECT season_xp FROM season_progress
            WHERE season_id = ? AND user_id = ?
            """,
            (season["id"], user_id),
        ).fetchone()
        season_xp = progress["season_xp"] if progress else 0
        current_level = min(
            season["max_level"],
            season_xp // season["xp_per_level"] + 1,
        )

        reward = db.execute(
            """
            SELECT * FROM season_rewards
            WHERE id = ? AND season_id = ?
            """,
            (reward_id, season["id"]),
        ).fetchone()
        if not reward:
            raise HTTPException(404, "Нагороду не знайдено")
        if reward["level"] > current_level:
            raise HTTPException(400, "Цей рівень сезону ще не відкрито")

        claimed = db.execute(
            """
            SELECT 1 FROM season_reward_claims
            WHERE user_id = ? AND reward_id = ?
            """,
            (user_id, reward_id),
        ).fetchone()
        if claimed:
            raise HTTPException(409, "Нагороду вже отримано")

        if reward["reward_type"] == "rh":
            add_balance(
                db,
                user_id,
                reward["reward_value"],
                f"Сезонна нагорода: {reward['title']}",
                max(2, reward["reward_value"] // 3),
            )

        db.execute(
            """
            INSERT INTO season_reward_claims(
                season_id, user_id, reward_id, claimed_at
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                season["id"],
                user_id,
                reward_id,
                int(time.time()),
            ),
        )
        db.commit()

        balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()[0]

    return {
        "ok": True,
        "balance": balance,
        "reward_value": reward["reward_value"],
    }




@app.get("/api/achievements")
async def achievements(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    with connect_db() as db:
        unlock_achievements(db, user_id)
        db.commit()
        rows = db.execute(
            """
            SELECT achievements.*,
                   user_achievements.unlocked_at,
                   COALESCE(user_achievements.claimed, 0) AS claimed
            FROM achievements
            LEFT JOIN user_achievements
              ON user_achievements.achievement_id = achievements.id
             AND user_achievements.user_id = ?
            WHERE achievements.is_active = 1
            ORDER BY achievements.id
            """,
            (user_id,),
        ).fetchall()

        result = []
        for row in rows:
            item = dict(row)
            item["progress"] = achievement_value(db, user_id, row)
            item["unlocked"] = row["unlocked_at"] is not None
            result.append(item)

    return result


@app.post("/api/achievements/{achievement_id}/claim")
async def claim_achievement(
    achievement_id: int,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    with connect_db() as db:
        row = db.execute(
            """
            SELECT achievements.*, user_achievements.claimed
            FROM achievements
            JOIN user_achievements
              ON user_achievements.achievement_id = achievements.id
            WHERE achievements.id = ?
              AND user_achievements.user_id = ?
            """,
            (achievement_id, user_id),
        ).fetchone()
        if not row:
            raise HTTPException(400, "Досягнення ще не відкрито")
        if row["claimed"]:
            raise HTTPException(409, "Нагороду вже отримано")

        db.execute(
            """
            UPDATE user_achievements
            SET claimed = 1, claimed_at = ?
            WHERE user_id = ? AND achievement_id = ?
            """,
            (int(time.time()), user_id, achievement_id),
        )
        add_balance(
            db,
            user_id,
            row["reward"],
            f"Досягнення: {row['title']}",
            row["xp_reward"],
        )
        db.commit()

    return {"ok": True}


@app.get("/api/missions")
async def missions(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    with connect_db() as db:
        rows = db.execute(
            """
            SELECT daily_missions.*,
                   COALESCE(mission_progress.progress, 0) AS progress,
                   COALESCE(mission_progress.claimed, 0) AS claimed
            FROM daily_missions
            LEFT JOIN mission_progress
              ON mission_progress.mission_id = daily_missions.id
             AND mission_progress.user_id = ?
             AND mission_progress.mission_date = ?
            WHERE daily_missions.is_active = 1
            ORDER BY daily_missions.id
            """,
            (user_id, today_key()),
        ).fetchall()

    return [dict(row) for row in rows]


@app.post("/api/missions/{mission_id}/claim")
async def claim_mission(
    mission_id: int,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    with connect_db() as db:
        row = db.execute(
            """
            SELECT daily_missions.*,
                   mission_progress.progress,
                   mission_progress.claimed
            FROM daily_missions
            JOIN mission_progress
              ON mission_progress.mission_id = daily_missions.id
            WHERE daily_missions.id = ?
              AND mission_progress.user_id = ?
              AND mission_progress.mission_date = ?
            """,
            (mission_id, user_id, today_key()),
        ).fetchone()
        if not row or row["progress"] < row["target_value"]:
            raise HTTPException(400, "Місію ще не виконано")
        if row["claimed"]:
            raise HTTPException(409, "Нагороду вже отримано")

        db.execute(
            """
            UPDATE mission_progress
            SET claimed = 1
            WHERE user_id = ? AND mission_id = ? AND mission_date = ?
            """,
            (user_id, mission_id, today_key()),
        )
        add_balance(
            db,
            user_id,
            row["reward"],
            f"Місія: {row['title']}",
            row["xp_reward"],
        )
        db.commit()

    return {"ok": True}


@app.get("/api/tournaments")
async def tournaments(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])
    now = int(time.time())

    with connect_db() as db:
        auto_finalized = finalize_expired_tournaments(db)
        db.commit()

        rows = db.execute(
            "SELECT * FROM tournaments ORDER BY id DESC"
        ).fetchall()
        result = []

        for tournament in rows:
            if tournament["is_finalized"]:
                board = db.execute(
                    """
                    SELECT tournament_results.place,
                           tournament_results.score,
                           tournament_results.reward,
                           users.telegram_id,
                           users.first_name,
                           users.username
                    FROM tournament_results
                    JOIN users ON users.telegram_id = tournament_results.user_id
                    WHERE tournament_results.tournament_id = ?
                    ORDER BY tournament_results.place ASC
                    LIMIT 20
                    """,
                    (tournament["id"],),
                ).fetchall()
            else:
                board = db.execute(
                    """
                    SELECT tournament_scores.score,
                           users.telegram_id,
                           users.first_name,
                           users.username
                    FROM tournament_scores
                    JOIN users ON users.telegram_id = tournament_scores.user_id
                    WHERE tournament_scores.tournament_id = ?
                    ORDER BY tournament_scores.score DESC,
                             tournament_scores.updated_at ASC
                    LIMIT 20
                    """,
                    (tournament["id"],),
                ).fetchall()

            mine = db.execute(
                "SELECT score FROM tournament_scores WHERE tournament_id = ? AND user_id = ?",
                (tournament["id"], user_id),
            ).fetchone()

            item = dict(tournament)
            item["leaderboard"] = [dict(row) for row in board]
            item["my_score"] = mine["score"] if mine else 0

            if tournament["is_cancelled"]:
                item["status"] = "cancelled"
                item["seconds_remaining"] = 0
            elif tournament["is_finalized"]:
                item["status"] = "finished"
                item["seconds_remaining"] = 0
            elif now < tournament["starts_at"]:
                item["status"] = "upcoming"
                item["seconds_remaining"] = tournament["starts_at"] - now
            else:
                item["status"] = "active"
                item["seconds_remaining"] = max(0, tournament["ends_at"] - now)

            result.append(item)

    for tournament_id, winners in auto_finalized:
        await notify_tournament_winners(tournament_id, winners)

    return result


@app.post("/api/admin/tournaments")
async def admin_create_tournament(
    payload: dict,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))

    with connect_db() as db:
        db.execute(
            """
            INSERT INTO tournaments(
                title, description, starts_at, ends_at,
                prize_1, prize_2, prize_3
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(payload.get("title", "")).strip(),
                str(payload.get("description", "")).strip(),
                int(payload.get("starts_at", 0)),
                int(payload.get("ends_at", 0)),
                int(payload.get("prize_1", 0)),
                int(payload.get("prize_2", 0)),
                int(payload.get("prize_3", 0)),
            ),
        )
        db.commit()

    return {"ok": True}


@app.get("/api/admin/tournaments")
async def admin_tournaments(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))

    with connect_db() as db:
        finalize_expired_tournaments(db)
        db.commit()
        rows = db.execute(
            """
            SELECT tournaments.*,
                   COUNT(DISTINCT tournament_scores.user_id) AS participants_count,
                   COALESCE(MAX(tournament_scores.score), 0) AS top_score
            FROM tournaments
            LEFT JOIN tournament_scores
              ON tournament_scores.tournament_id = tournaments.id
            GROUP BY tournaments.id
            ORDER BY tournaments.id DESC
            """
        ).fetchall()

    return [dict(row) for row in rows]


@app.post("/api/admin/tournaments/{tournament_id}/finish")
async def admin_finish_tournament(
    tournament_id: int,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    admin_id = int(user["id"])
    require_admin(admin_id)

    with connect_db() as db:
        winners = finalize_tournament(db, tournament_id)
        log_admin_action(
            db,
            admin_id,
            "tournament_finished",
            f"Достроково завершено турнір #{tournament_id}",
        )
        db.commit()

    notified = await notify_tournament_winners(tournament_id, winners)
    return {
        "ok": True,
        "winners_count": len(winners),
        "notified": notified,
    }


@app.post("/api/admin/tournaments/{tournament_id}/cancel")
async def admin_cancel_tournament(
    tournament_id: int,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    admin_id = int(user["id"])
    require_admin(admin_id)

    with connect_db() as db:
        tournament = db.execute(
            "SELECT * FROM tournaments WHERE id = ?",
            (tournament_id,),
        ).fetchone()
        if not tournament:
            raise HTTPException(404, "Турнір не знайдено")
        if tournament["is_finalized"]:
            raise HTTPException(409, "Завершений турнір не можна скасувати")
        if tournament["is_cancelled"]:
            raise HTTPException(409, "Турнір уже скасовано")

        now = int(time.time())
        db.execute(
            """
            UPDATE tournaments
            SET is_cancelled = 1,
                is_active = 0,
                cancelled_at = ?
            WHERE id = ?
            """,
            (now, tournament_id),
        )
        log_admin_action(
            db,
            admin_id,
            "tournament_cancelled",
            f"Скасовано турнір #{tournament_id}",
        )
        db.commit()

    return {"ok": True}




@app.post("/api/admin/promos")
async def admin_create_promo(
    payload: dict,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    require_admin(int(user["id"]))

    code_value = str(payload.get("code", "")).strip().upper()
    discount = int(payload.get("discount_percent", 0))
    if not code_value or discount < 1 or discount > 90:
        raise HTTPException(400, "Перевір код і знижку")

    with connect_db() as db:
        db.execute(
            """
            INSERT INTO promo_codes(
                code, discount_percent, max_uses, expires_at
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                code_value,
                discount,
                int(payload.get("max_uses", 0)),
                int(payload.get("expires_at", 0)),
            ),
        )
        db.commit()

    return {"ok": True}






@app.get("/api/lottery-summary")
async def lottery_summary(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    with connect_db() as db:
        draw_expired_lotteries(db)
        db.commit()

        active = db.execute(
            """
            SELECT * FROM lotteries
            WHERE status = 'active'
            ORDER BY ends_at ASC, id DESC
            LIMIT 1
            """
        ).fetchone()

        last_drawn = db.execute(
            """
            SELECT * FROM lotteries
            WHERE status = 'drawn'
            ORDER BY drawn_at DESC, id DESC
            LIMIT 1
            """
        ).fetchone()

        total_draws = db.execute(
            "SELECT COUNT(*) FROM lotteries"
        ).fetchone()[0]

        my_total_tickets = db.execute(
            """
            SELECT COUNT(*) FROM lottery_tickets
            WHERE user_id = ?
            """,
            (user_id,),
        ).fetchone()[0]

        balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()["balance"]

        payload = {
            "balance": int(balance),
            "total_draws": int(total_draws),
            "my_total_tickets": int(my_total_tickets),
            "active": lottery_public_row(db, active, user_id) if active else None,
            "last_winner": lottery_public_row(db, last_drawn, user_id) if last_drawn else None,
        }
        return payload


@app.get("/api/lotteries")
async def list_lotteries(
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    with connect_db() as db:
        draw_expired_lotteries(db)
        db.commit()
        rows = db.execute(
            "SELECT * FROM lotteries ORDER BY id DESC"
        ).fetchall()
        return [lottery_public_row(db, row, user_id) for row in rows]


@app.get("/api/lotteries/{lottery_id}")
async def get_lottery(
    lottery_id: int,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])

    with connect_db() as db:
        row = db.execute(
            "SELECT * FROM lotteries WHERE id = ?",
            (lottery_id,),
        ).fetchone()
        if not row:
            raise HTTPException(404, "Розіграш не знайдено")
        if row["status"] == "active" and int(time.time()) >= int(row["ends_at"]):
            row = draw_lottery(db, lottery_id)
            db.commit()
        return lottery_public_row(db, row, user_id)


@app.post("/api/lotteries/{lottery_id}/tickets")
async def buy_lottery_tickets(
    lottery_id: int,
    payload: LotteryTicketPurchasePayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    user_id = int(user["id"])
    now = int(time.time())

    with connect_db() as db:
        # Lock writes so two simultaneous purchase requests cannot overspend balance.
        db.execute("BEGIN IMMEDIATE")

        lottery = db.execute(
            "SELECT * FROM lotteries WHERE id = ?",
            (lottery_id,),
        ).fetchone()
        if not lottery:
            db.rollback()
            raise HTTPException(404, "Розіграш не знайдено")

        if lottery["status"] != "active":
            db.rollback()
            raise HTTPException(409, "Продаж квитків уже закритий")
        if now < int(lottery["starts_at"]):
            db.rollback()
            raise HTTPException(409, "Продаж квитків ще не почався")
        if now >= int(lottery["ends_at"]):
            db.rollback()
            raise HTTPException(409, "Продаж квитків завершено")

        price = int(lottery["ticket_price"])
        total_cost = price * int(payload.count)

        account = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()
        if not account:
            db.rollback()
            raise HTTPException(404, "Користувача не знайдено")
        if int(account["balance"]) < total_cost:
            db.rollback()
            raise HTTPException(400, "Недостатньо RH для купівлі квитків")

        db.execute(
            """
            UPDATE users
            SET balance = balance - ?, last_seen = ?
            WHERE telegram_id = ?
            """,
            (total_cost, now, user_id),
        )
        db.executemany(
            """
            INSERT INTO lottery_tickets(lottery_id, user_id, purchased_at)
            VALUES (?, ?, ?)
            """,
            [(lottery_id, user_id, now)] * int(payload.count),
        )
        db.execute(
            """
            INSERT INTO ledger(user_id, amount, note, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                user_id,
                -total_cost,
                f"Квитки x{payload.count}: {lottery['title']}",
                now,
            ),
        )
        db.commit()

        updated = db.execute(
            "SELECT * FROM lotteries WHERE id = ?",
            (lottery_id,),
        ).fetchone()
        balance = db.execute(
            "SELECT balance FROM users WHERE telegram_id = ?",
            (user_id,),
        ).fetchone()["balance"]

        return {
            "ok": True,
            "count": int(payload.count),
            "spent": total_cost,
            "balance": int(balance),
            "lottery": lottery_public_row(db, updated, user_id),
        }


@app.get("/api/lotteries/{lottery_id}/verify")
async def verify_lottery_result(
    lottery_id: int,
    x_telegram_init_data: str | None = Header(default=None),
):
    current_user(x_telegram_init_data)

    with connect_db() as db:
        lottery = db.execute(
            "SELECT * FROM lotteries WHERE id = ?",
            (lottery_id,),
        ).fetchone()
        if not lottery:
            raise HTTPException(404, "Розіграш не знайдено")

        if lottery["status"] != "drawn":
            return {
                "drawn": False,
                "seed_hash": lottery["seed_hash"],
                "message": "Seed прихований до завершення розіграшу.",
            }

        log = db.execute(
            "SELECT * FROM lottery_draw_log WHERE lottery_id = ?",
            (lottery_id,),
        ).fetchone()

        return {
            "drawn": True,
            "lottery_id": lottery_id,
            "seed_hash": lottery["seed_hash"],
            "revealed_seed": lottery["secret_seed"],
            "tickets_hash": lottery["tickets_hash"],
            "total_tickets": int(log["total_tickets"]) if log else 0,
            "winning_ticket_id": lottery["winning_ticket_id"],
            "winner_id": lottery["winner_id"],
            "formula": "SHA256(seed:lottery_id:ends_at:tickets_hash) mod total_tickets",
        }


@app.post("/api/admin/lotteries")
async def admin_create_lottery(
    payload: LotteryCreatePayload,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    admin_id = int(user["id"])
    require_admin(admin_id)

    if payload.ends_at <= payload.starts_at:
        raise HTTPException(400, "Дата завершення має бути пізніше старту")

    secret_seed = secrets.token_hex(32)
    seed_hash = hashlib.sha256(secret_seed.encode()).hexdigest()
    now = int(time.time())

    with connect_db() as db:
        cursor = db.execute(
            """
            INSERT INTO lotteries(
                title, description, prize_name, prize_emoji,
                ticket_price, starts_at, ends_at, status,
                seed_hash, secret_seed, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
            """,
            (
                payload.title.strip(),
                payload.description.strip(),
                payload.prize_name.strip(),
                payload.prize_emoji.strip() or "🎁",
                int(payload.ticket_price),
                int(payload.starts_at),
                int(payload.ends_at),
                seed_hash,
                secret_seed,
                now,
            ),
        )
        lottery_id = int(cursor.lastrowid)
        log_admin_action(
            db,
            admin_id,
            "lottery_created",
            f"Створено розіграш #{lottery_id}: {payload.title}",
        )
        db.commit()

    return {"ok": True, "id": lottery_id, "seed_hash": seed_hash}


@app.post("/api/admin/lotteries/{lottery_id}/draw")
async def admin_draw_lottery(
    lottery_id: int,
    x_telegram_init_data: str | None = Header(default=None),
):
    user = current_user(x_telegram_init_data)
    admin_id = int(user["id"])
    require_admin(admin_id)

    with connect_db() as db:
        drawn = draw_lottery(db, lottery_id)
        log_admin_action(
            db,
            admin_id,
            "lottery_drawn",
            f"Зафіксовано результат розіграшу #{lottery_id}",
        )
        db.commit()
        return lottery_public_row(db, drawn, admin_id)


@app.get("/api/history")
async def history(x_telegram_init_data: str | None = Header(default=None)):
    user = current_user(x_telegram_init_data)

    with connect_db() as db:
        rows = db.execute(
            """
            SELECT amount, note, created_at
            FROM ledger
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT 30
            """,
            (int(user["id"]),),
        ).fetchall()

    return [dict(row) for row in rows]


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8080")),
        reload=False,
    )
