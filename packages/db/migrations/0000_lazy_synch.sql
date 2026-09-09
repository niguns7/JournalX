CREATE TYPE "public"."account_status" AS ENUM('ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('EVALUATION', 'SIM_FUNDED', 'LIVE', 'PAPER', 'REPLAY');--> statement-breakpoint
CREATE TYPE "public"."attachment_stage" AS ENUM('BEFORE', 'ENTRY', 'AFTER', 'TIMEFRAME');--> statement-breakpoint
CREATE TYPE "public"."attachment_status" AS ENUM('ACTIVE', 'DELETED');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('CREATE', 'UPDATE', 'DELETE', 'VOID', 'CORRECT', 'PUBLISH', 'ARCHIVE', 'REOPEN');--> statement-breakpoint
CREATE TYPE "public"."checklist_answer" AS ENUM('PASS', 'FAIL', 'UNANSWERED', 'NOT_APPLICABLE');--> statement-breakpoint
CREATE TYPE "public"."daily_grade" AS ENUM('A', 'B', 'C', 'D');--> statement-breakpoint
CREATE TYPE "public"."idempotency_status" AS ENUM('PENDING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."impact_level" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."journal_status" AS ENUM('DRAFT', 'ACTIVE', 'REVIEWED');--> statement-breakpoint
CREATE TYPE "public"."management_event_kind" AS ENUM('STOP_LOSS_UPDATE', 'TAKE_PROFIT_UPDATE', 'NOTE');--> statement-breakpoint
CREATE TYPE "public"."quarter_id" AS ENUM('Q1', 'Q2', 'Q3', 'Q4');--> statement-breakpoint
CREATE TYPE "public"."quarter_model" AS ENUM('AMD', 'XAMD', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."recording_mode" AS ENUM('NORMAL', 'RETROSPECTIVE');--> statement-breakpoint
CREATE TYPE "public"."scenario_kind" AS ENUM('SHORT', 'LONG', 'NO_TRADE');--> statement-breakpoint
CREATE TYPE "public"."strategy_version_status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TYPE "public"."timeframe" AS ENUM('4H', '1H', '15M', '5M', '1M');--> statement-breakpoint
CREATE TYPE "public"."trade_direction" AS ENUM('LONG', 'SHORT');--> statement-breakpoint
CREATE TYPE "public"."trade_state" AS ENUM('PLANNED', 'OPEN', 'CLOSED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."violation_severity" AS ENUM('WARNING', 'SERIOUS', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."violation_source" AS ENUM('MANUAL', 'RULE_ENGINE');--> statement-breakpoint
CREATE TYPE "public"."zone_kind" AS ENUM('SUPPLY', 'DEMAND', 'PREMIUM_FVG', 'DISCOUNT_FVG', 'ORDER_BLOCK', 'LIQUIDITY_POOL', 'OTHER');--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_timezone" varchar(64) DEFAULT 'Asia/Kathmandu' NOT NULL,
	"display_timezone" varchar(64) DEFAULT 'Asia/Kathmandu' NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"default_account_id" uuid,
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trading_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128) NOT NULL,
	"type" "account_type" DEFAULT 'PAPER' NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"nominal_size" numeric(18, 2),
	"risk_basis_amount" numeric(18, 2),
	"status" "account_status" DEFAULT 'ACTIVE' NOT NULL,
	"risk_defaults" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instruments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" varchar(32) NOT NULL,
	"display_name" varchar(128) NOT NULL,
	"tick_size" numeric(18, 6) NOT NULL,
	"point_value" numeric(18, 6) NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"verified_source" varchar(255),
	"verified_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instruments_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "strategies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"current_published_version_id" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"strategy_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"status" "strategy_version_status" DEFAULT 'DRAFT' NOT NULL,
	"rules" jsonb NOT NULL,
	"checklist" jsonb NOT NULL,
	"narrative" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_journals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_date" date NOT NULL,
	"timezone_snapshot" varchar(64) DEFAULT 'Asia/Kathmandu' NOT NULL,
	"status" "journal_status" DEFAULT 'DRAFT' NOT NULL,
	"sleep_quality" integer,
	"focus_rating" integer,
	"stress_rating" integer,
	"emotional_state" text,
	"preparation_notes" text,
	"readiness" jsonb DEFAULT '{"items":[]}'::jsonb,
	"process_evaluation" jsonb DEFAULT '{"items":[]}'::jsonb,
	"reflection" jsonb DEFAULT '{}'::jsonb,
	"daily_grade" "daily_grade",
	"grade_override" "daily_grade",
	"grade_override_reason" text,
	"grade_rule_version" varchar(32) DEFAULT 'v1',
	"reviewed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_journals_journal_date_unique" UNIQUE("journal_date")
);
--> statement-breakpoint
CREATE TABLE "economic_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"occurs_at" timestamp with time zone NOT NULL,
	"impact" "impact_level" DEFAULT 'LOW' NOT NULL,
	"restriction_start" timestamp with time zone,
	"restriction_end" timestamp with time zone,
	"notes" text,
	"checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_account_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"max_trades" integer,
	"max_daily_loss" numeric(18, 2),
	"consecutive_loss_limit" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"window_id" uuid,
	"kind" "scenario_kind" NOT NULL,
	"conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"narrative" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"label" varchar(64) NOT NULL,
	"timezone" varchar(64) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"quarter_config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"kind" "zone_kind" NOT NULL,
	"lower_price" numeric(18, 6) NOT NULL,
	"upper_price" numeric(18, 6) NOT NULL,
	"confluence" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quarter_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_id" uuid NOT NULL,
	"quarter" "quarter_id" NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"range_high" numeric(18, 6),
	"range_low" numeric(18, 6),
	"true_open_price" numeric(18, 6),
	"model" "quarter_model" DEFAULT 'UNKNOWN',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeframe_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"window_id" uuid,
	"timeframe" timeframe NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"narrative" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_checklist_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_id" uuid NOT NULL,
	"item_key" varchar(64) NOT NULL,
	"answer" "checklist_answer" NOT NULL,
	"evidence_note" text,
	"observed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_management_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_id" uuid NOT NULL,
	"kind" "management_event_kind" NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"old_value" text,
	"new_value" text,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_violations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_id" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"severity" "violation_severity" NOT NULL,
	"source" "violation_source" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"strategy_version_id" uuid NOT NULL,
	"window_id" uuid,
	"scenario_id" uuid,
	"state" "trade_state" DEFAULT 'PLANNED' NOT NULL,
	"recording_mode" "recording_mode" DEFAULT 'NORMAL' NOT NULL,
	"direction" "trade_direction" NOT NULL,
	"actual_contract_symbol" varchar(32),
	"planned_entry" numeric(18, 6),
	"actual_entry" numeric(18, 6),
	"original_stop" numeric(18, 6) NOT NULL,
	"original_target" numeric(18, 6) NOT NULL,
	"quantity" integer NOT NULL,
	"exit_price" numeric(18, 6),
	"entry_at" timestamp with time zone,
	"exit_at" timestamp with time zone,
	"actual_fees" numeric(18, 2),
	"fees_confirmed" boolean DEFAULT false NOT NULL,
	"observed_adverse_points" numeric(18, 6),
	"observed_favorable_points" numeric(18, 6),
	"snapshot" jsonb DEFAULT '{}'::jsonb,
	"review" jsonb DEFAULT '{}'::jsonb,
	"reviewed_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(64) NOT NULL,
	"bytes" integer NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"journal_id" uuid,
	"trade_id" uuid,
	"stage" "attachment_stage",
	"timeframe" varchar(16),
	"caption" text,
	"status" "attachment_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attachments_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(64) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"reason" text,
	"before_json" jsonb,
	"after_json" jsonb,
	"request_id" varchar(64),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation" varchar(128) NOT NULL,
	"key" varchar(128) NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"result_resource_id" uuid,
	"result_status" integer,
	"result_body" jsonb,
	"status" "idempotency_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_default_account_id_trading_accounts_id_fk" FOREIGN KEY ("default_account_id") REFERENCES "public"."trading_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_versions" ADD CONSTRAINT "strategy_versions_strategy_id_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "economic_events" ADD CONSTRAINT "economic_events_journal_id_daily_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."daily_journals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_account_limits" ADD CONSTRAINT "journal_account_limits_journal_id_daily_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."daily_journals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_account_limits" ADD CONSTRAINT "journal_account_limits_account_id_trading_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."trading_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_scenarios" ADD CONSTRAINT "journal_scenarios_journal_id_daily_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."daily_journals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_scenarios" ADD CONSTRAINT "journal_scenarios_window_id_journal_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."journal_windows"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_windows" ADD CONSTRAINT "journal_windows_journal_id_daily_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."daily_journals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_zones" ADD CONSTRAINT "market_zones_analysis_id_timeframe_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."timeframe_analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quarter_observations" ADD CONSTRAINT "quarter_observations_window_id_journal_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."journal_windows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeframe_analyses" ADD CONSTRAINT "timeframe_analyses_journal_id_daily_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."daily_journals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeframe_analyses" ADD CONSTRAINT "timeframe_analyses_window_id_journal_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."journal_windows"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_checklist_answers" ADD CONSTRAINT "trade_checklist_answers_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_management_events" ADD CONSTRAINT "trade_management_events_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_violations" ADD CONSTRAINT "trade_violations_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_journal_id_daily_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."daily_journals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_account_id_trading_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."trading_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_strategy_version_id_strategy_versions_id_fk" FOREIGN KEY ("strategy_version_id") REFERENCES "public"."strategy_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_window_id_journal_windows_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."journal_windows"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_scenario_id_journal_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."journal_scenarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_journal_id_daily_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."daily_journals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "strategy_versions_strategy_version_idx" ON "strategy_versions" USING btree ("strategy_id","version_number");--> statement-breakpoint
CREATE INDEX "daily_journals_date_idx" ON "daily_journals" USING btree ("journal_date");--> statement-breakpoint
CREATE INDEX "daily_journals_status_idx" ON "daily_journals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "economic_events_journal_idx" ON "economic_events" USING btree ("journal_id");--> statement-breakpoint
CREATE INDEX "economic_events_occurs_at_idx" ON "economic_events" USING btree ("occurs_at");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_account_limits_journal_account_idx" ON "journal_account_limits" USING btree ("journal_id","account_id");--> statement-breakpoint
CREATE INDEX "journal_scenarios_journal_idx" ON "journal_scenarios" USING btree ("journal_id");--> statement-breakpoint
CREATE INDEX "journal_windows_journal_idx" ON "journal_windows" USING btree ("journal_id");--> statement-breakpoint
CREATE INDEX "market_zones_analysis_idx" ON "market_zones" USING btree ("analysis_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quarter_observations_window_quarter_idx" ON "quarter_observations" USING btree ("window_id","quarter");--> statement-breakpoint
CREATE INDEX "timeframe_analyses_journal_tf_idx" ON "timeframe_analyses" USING btree ("journal_id","timeframe");--> statement-breakpoint
CREATE UNIQUE INDEX "trade_checklist_answers_trade_item_idx" ON "trade_checklist_answers" USING btree ("trade_id","item_key");--> statement-breakpoint
CREATE INDEX "trade_management_events_trade_idx" ON "trade_management_events" USING btree ("trade_id");--> statement-breakpoint
CREATE INDEX "trade_violations_trade_idx" ON "trade_violations" USING btree ("trade_id");--> statement-breakpoint
CREATE INDEX "trade_violations_code_idx" ON "trade_violations" USING btree ("code");--> statement-breakpoint
CREATE INDEX "trades_journal_idx" ON "trades" USING btree ("journal_id");--> statement-breakpoint
CREATE INDEX "trades_account_state_entry_idx" ON "trades" USING btree ("account_id","state","entry_at");--> statement-breakpoint
CREATE INDEX "trades_exit_at_idx" ON "trades" USING btree ("exit_at");--> statement-breakpoint
CREATE INDEX "trades_strategy_version_idx" ON "trades" USING btree ("strategy_version_id");--> statement-breakpoint
CREATE INDEX "attachments_journal_idx" ON "attachments" USING btree ("journal_id");--> statement-breakpoint
CREATE INDEX "attachments_trade_idx" ON "attachments" USING btree ("trade_id");--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_events_occurred_at_idx" ON "audit_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_requests_op_key_idx" ON "idempotency_requests" USING btree ("operation","key");