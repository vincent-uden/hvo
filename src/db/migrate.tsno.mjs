import {createRequire as __$$createRequireN} from 'module';var require=__$$createRequireN(import.meta.url);
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};

// ../../../../home/vincent/.npm/_npx/1a90fbf4b9b2801d/node_modules/tsno/dist/client.js
import { createRequire as __$$createRequire } from "module";
var require2;
var init_client = __esm({
  "../../../../home/vincent/.npm/_npx/1a90fbf4b9b2801d/node_modules/tsno/dist/client.js"() {
    require2 = __$$createRequire("file:///home/vincent/.npm/_npx/1a90fbf4b9b2801d/node_modules/tsno/dist/client.js");
  }
});

// src/db/migrate.ts
init_client();
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import dotenv from "dotenv";
dotenv.config();
console.log(process.env.PSQL_URL);
var connectionString = process.env.PSQL_URL;
var sql = postgres(connectionString, { max: 1 });
var db = drizzle(sql, { logger: true });
await migrate(db, { migrationsFolder: "drizzle" });
console.log("Migration Complete");
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vLi4vaG9tZS92aW5jZW50Ly5ucG0vX25weC8xYTkwZmJmNGI5YjI4MDFkL25vZGVfbW9kdWxlcy90c25vL2Rpc3QvY2xpZW50LmpzIiwgInNyYy9kYi9taWdyYXRlLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQge2NyZWF0ZVJlcXVpcmUgYXMgX18kJGNyZWF0ZVJlcXVpcmV9IGZyb20gJ21vZHVsZSc7dmFyIHJlcXVpcmU9X18kJGNyZWF0ZVJlcXVpcmUoXCJmaWxlOi8vL2hvbWUvdmluY2VudC8ubnBtL19ucHgvMWE5MGZiZjRiOWIyODAxZC9ub2RlX21vZHVsZXMvdHNuby9kaXN0L2NsaWVudC5qc1wiKTtcbmltcG9ydCB7XG4gIGNvbG9yc1xufSBmcm9tIFwiLi9jaHVuay1GSERYWE9LWS5qc1wiO1xuXG5cbi8vIHNyYy9jbGllbnQudHNcbnZhciBmZXRjaCA9ICh1cmwsIGluaXQpID0+IGltcG9ydChcIi4vc3JjLTRRN1E2N0MzLmpzXCIpLnRoZW4oKHJlcykgPT4gcmVzLmRlZmF1bHQodXJsLCBpbml0KSk7XG52YXIgYXhpb3MgPSAoY29uZmlnKSA9PiBpbXBvcnQoXCIuL2F4aW9zLVBJWjRDNVVaLmpzXCIpLnRoZW4oKHJlcykgPT4gcmVzLmRlZmF1bHQoY29uZmlnKSk7XG5leHBvcnQge1xuICBheGlvcyxcbiAgY29sb3JzLFxuICBmZXRjaFxufTtcbiIsICJpbXBvcnQgeyBkcml6emxlIH0gZnJvbSBcImRyaXp6bGUtb3JtL3Bvc3RncmVzLWpzXCI7XG5pbXBvcnQgeyBtaWdyYXRlIH0gZnJvbSBcImRyaXp6bGUtb3JtL3Bvc3RncmVzLWpzL21pZ3JhdG9yXCI7XG5pbXBvcnQgcG9zdGdyZXMgZnJvbSBcInBvc3RncmVzXCI7XG5pbXBvcnQgZG90ZW52IGZyb20gXCJkb3RlbnZcIjtcblxuZG90ZW52LmNvbmZpZygpXG5cbmNvbnNvbGUubG9nKHByb2Nlc3MuZW52LlBTUUxfVVJMKVxuXG5jb25zdCBjb25uZWN0aW9uU3RyaW5nID0gcHJvY2Vzcy5lbnYuUFNRTF9VUkw7XG5jb25zdCBzcWwgPSBwb3N0Z3Jlcyhjb25uZWN0aW9uU3RyaW5nISEsIHsgbWF4OiAxIH0pO1xuY29uc3QgZGIgPSBkcml6emxlKHNxbCwgeyBsb2dnZXI6IHRydWUgfSk7XG5cbi8vY29uc29sZS5sb2coZGIuc2VsZWN0KCkuZnJvbSh1c2VycykpO1xuXG5hd2FpdCBtaWdyYXRlKGRiLCB7IG1pZ3JhdGlvbnNGb2xkZXI6IFwiZHJpenpsZVwiIH0pO1xuXG5jb25zb2xlLmxvZyhcIk1pZ3JhdGlvbiBDb21wbGV0ZVwiKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7QUFBQSxTQUFRLGlCQUFpQix5QkFBd0I7QUFBakQsSUFBOERBO0FBQTlEO0FBQUE7QUFBMEQsSUFBSUEsV0FBUSxrQkFBa0Isa0ZBQWtGO0FBQUE7QUFBQTs7O0FDQTFLO0FBQUEsU0FBUyxlQUFlO0FBQ3hCLFNBQVMsZUFBZTtBQUN4QixPQUFPLGNBQWM7QUFDckIsT0FBTyxZQUFZO0FBRW5CLE9BQU8sT0FBTztBQUVkLFFBQVEsSUFBSSxRQUFRLElBQUksUUFBUTtBQUVoQyxJQUFNLG1CQUFtQixRQUFRLElBQUk7QUFDckMsSUFBTSxNQUFNLFNBQVMsa0JBQW9CLEVBQUUsS0FBSyxFQUFFLENBQUM7QUFDbkQsSUFBTSxLQUFLLFFBQVEsS0FBSyxFQUFFLFFBQVEsS0FBSyxDQUFDO0FBSXhDLE1BQU0sUUFBUSxJQUFJLEVBQUUsa0JBQWtCLFVBQVUsQ0FBQztBQUVqRCxRQUFRLElBQUksb0JBQW9COyIsCiAgIm5hbWVzIjogWyJyZXF1aXJlIl0KfQo=
