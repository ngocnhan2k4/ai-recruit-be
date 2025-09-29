import { categories } from "@/frameworks/data-services/postgres/model/category.model";
import { provinces } from "@/frameworks/data-services/postgres/model/province.model";
import { skills } from "@/frameworks/data-services/postgres/model/skill.model";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const categoriesData = [
  "Frontend Developer",
  "Backend Developer",
  "Fullstack Developer",
  "Mobile Developer",
  "UI/UX Designer",
  "DevOps Engineer",
  "Data Scientist",
  "Product Manager",
  "QA Engineer",
  "System Administrator",
  "Database Administrator",
  "Security Specialist",
];

const skillsData = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Django",
  "React",
  "Node.js",
];
const provincesData = [
  "Hà Nội",
  "Cao Bằng",
  "Tuyên Quang", // gộp Hà Giang + Tuyên Quang
  "Điện Biên",
  "Lai Châu",
  "Sơn La",
  "Lạng Sơn",
  "Quảng Ninh",
  "Thái Nguyên", // gộp Thái Nguyên + Bắc Kạn
  "Quảng Trị", // gộp Quảng Trị + Quảng Bình
  "Huế", // thành phố Huế (giữ nguyên)
  "Hải Phòng", // gộp Hải Phòng + Hải Dương
  "Hưng Yên", // gộp Hưng Yên + Thái Bình
  "Bắc Ninh", // gộp Bắc Ninh + Bắc Giang
  "Ninh Bình", // gộp Ninh Bình + Hà Nam + Nam Định
  "Thanh Hóa",
  "Nghệ An",
  "Hà Tĩnh",
  "Quảng Ngãi", // giữ nguyên
  "Gia Lai", // gộp Gia Lai + Bình Định
  "Khánh Hòa", // gộp Khánh Hòa + Ninh Thuận
  "Lâm Đồng", // gộp Lâm Đồng + Bình Thuận + Đắk Nông
  "Đắk Lắk", // gộp Đắk Lắk + Phú Yên
  "Đồng Nai", // giữ nguyên (Đồng Nai)
  "Thành phố Hồ Chí Minh", // gộp TP HCM + Bình Dương + Bà Rịa – Vũng Tàu
  "Tây Ninh", // giữ nguyên
  "Cần Thơ", // gộp Cần Thơ + Sóc Trăng + Hậu Giang
  "Vĩnh Long", // gộp Vĩnh Long + Bến Tre + Trà Vinh
  "Đồng Tháp", // gộp Đồng Tháp + Tiền Giang
  "Cà Mau", // gộp Cà Mau + Bạc Liêu
  "An Giang", // gộp An Giang + Kiên Giang
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  // Insert categories - skip if name already exists
  await db
    .insert(categories)
    .values(categoriesData.map((name) => ({ name })))
    .onConflictDoNothing({ target: categories.name });

  // Insert skills - skip if name already exists
  await db
    .insert(skills)
    .values(skillsData.map((name) => ({ name })))
    .onConflictDoNothing({ target: skills.name });

  // Insert provinces - skip if name already exists
  await db
    .insert(provinces)
    .values(provincesData.map((name) => ({ name })))
    .onConflictDoNothing({ target: provinces.name });

  console.log("✅ Seeded categories and skills!");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
