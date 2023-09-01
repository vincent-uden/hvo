CREATE TABLE IF NOT EXISTS "price_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"price" numeric(8, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
