CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"age" integer,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
