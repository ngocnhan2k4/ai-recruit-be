import { categories } from "@/frameworks/data-services/postgres/models/category.model";
import { blogCategories } from "@/frameworks/data-services/postgres/models/blog.model";
import { provinces } from "@/frameworks/data-services/postgres/models/province.model";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { organizations } from "@/frameworks/data-services/postgres/models";
import { OrganizationTypeEnum } from "@/core/entities/enum.entity";
import { slugify } from "@/common/utils/string";

const categoriesData = [
  // 🔹 Software Development
  "Frontend Developer",
  "Backend Developer",
  "Fullstack Developer",
  "Software Engineer",
  "Mobile Application Developer",
  "Game Developer",
  "Embedded Engineer",

  // 🔹 UI/UX
  "UI/UX Designer",
  "UX Researcher",

  // 🔹 Data & AI
  "Data Analyst",
  "Data Engineer",
  "Data Scientist",
  "AI & Machine Learning",

  // 🔹 Testing / QA
  "Manual Tester",
  "Automation Tester",
  "QA Engineer",

  // 🔹 DevOps / Cloud / Infra
  "DevOps & Cloud Engineer",
  "Cloud Engineer",
  "Site Reliability Engineer (SRE)",
  "Systems Engineer & Administrator",
  "System Administrator",
  "Network Engineer",

  // 🔹 Security
  "Security Engineer",
  "Security Specialist",
  "Penetration Tester",
  "Application Security Engineer",

  // 🔹 Database
  "Database Engineer",
  "Database Administrator",

  // 🔹 Product / Business
  "Product Manager",
  "Project Manager",
  "Business Analyst",
  "IT Consultant",

  // 🔹 Support / Others
  "IT Support",
  "Solution Architect",
  "Cloud Architect",
  "Bridge System Engineer (BrSE)",
];

const blogCategoriesData = [
  {
    name: "CV",
    description: "Tips and guidance for creating effective CVs",
  },
  {
    name: "Interview",
    description: "Interview preparation and best practices",
  },
  {
    name: "Career Advice",
    description: "Career growth strategies and professional advice",
  },
  {
    name: "AI",
    description: "AI trends, tools, and applications for careers",
  },
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

const universitiesData = [
  // Hà Nội
  "Đại học Quốc gia Hà Nội",
  "Đại học Bách khoa Hà Nội",
  "Đại học Kinh tế Quốc dân",
  "Đại học Ngoại thương",
  "Đại học Khoa học Tự nhiên - ĐHQGHN",
  "Đại học Công nghệ - ĐHQGHN",
  "Đại học Khoa học Xã hội và Nhân văn - ĐHQGHN",
  "Đại học Ngoại ngữ - ĐHQGHN",
  "Đại học Giáo dục - ĐHQGHN",
  "Đại học Y Hà Nội",
  "Đại học Luật Hà Nội",
  "Đại học Thương mại",
  "Đại học Giao thông Vận tải",
  "Đại học Công đoàn",
  "Đại học Thủ đô Hà Nội",
  "Đại học Hà Nội",
  "Đại học Xây dựng",
  "Đại học Mỏ - Địa chất",
  "Đại học Nông nghiệp Hà Nội",
  "Đại học Lâm nghiệp",
  "Đại học Thủy lợi",
  "Đại học Công nghiệp Hà Nội",
  "Đại học Tài chính - Marketing",
  "Đại học FPT",
  "Đại học RMIT Việt Nam",
  "Đại học VinUni",
  "Đại học Phenikaa",

  // TP. Hồ Chí Minh
  "Đại học Quốc gia TP.HCM",
  "Đại học Bách khoa TP.HCM",
  "Đại học Khoa học Tự nhiên TP.HCM",
  "Đại học Khoa học Xã hội và Nhân văn TP.HCM",
  "Đại học Kinh tế TP.HCM",
  "Đại học Công nghiệp TP.HCM",
  "Đại học Y Dược TP.HCM",
  "Đại học Sư phạm TP.HCM",
  "Đại học Luật TP.HCM",
  "Đại học Nông Lâm TP.HCM",
  "Đại học Kiến trúc TP.HCM",
  "Đại học Mỹ thuật TP.HCM",
  "Đại học Tôn Đức Thắng",
  "Đại học Hutech",
  "Đại học Văn Lang",
  "Đại học Hồng Bàng",
  "Đại học Gia Định",
  "Đại học Nguyễn Tất Thành",
  "Đại học Quốc tế Sài Gòn",
  "Đại học Fulbright Việt Nam",

  // Đà Nẵng
  "Đại học Đà Nẵng",
  "Đại học Bách khoa - ĐH Đà Nẵng",
  "Đại học Kinh tế - ĐH Đà Nẵng",
  "Đại học Sư phạm - ĐH Đà Nẵng",
  "Đại học Ngoại ngữ - ĐH Đà Nẵng",
  "Đại học Duy Tân",
  "Đại học Đông Á",

  // Huế
  "Đại học Huế",
  "Đại học Khoa học - ĐH Huế",
  "Đại học Y Dược Huế",
  "Đại học Sư phạm Huế",
  "Đại học Nông Lâm Huế",
  "Đại học Kinh tế Huế",

  // Cần Thơ
  "Đại học Cần Thơ",
  "Đại học Y Dược Cần Thơ",
  "Đại học Kỹ thuật - Công nghệ Cần Thơ",
  "Đại học Nam Cần Thơ",

  // Hải Phòng
  "Đại học Hàng hải Việt Nam",
  "Đại học Dược Hải Phòng",
  "Đại học Hải Phong",

  // Thái Nguyên
  "Đại học Thái Nguyên",
  "Đại học Kỹ thuật Công nghiệp - ĐH Thái Nguyên",
  "Đại học Sư phạm - ĐH Thái Nguyên",
  "Đại học Y Dược Thái Nguyên",

  // Nghệ An - Hà Tĩnh
  "Đại học Vinh",
  "Đại học Công nghiệp Vinh",
  "Đại học Hồng Đức",

  // Khánh Hòa
  "Đại học Nha Trang",
  "Đại học Khánh Hòa",

  // Đồng Nai - Bình Dương
  "Đại học Đồng Nai",
  "Đại học Lạc Hồng",
  "Đại học Thủ Dầu Một",
  "Đại học Quốc tế Miền Đông",

  // An Giang - Kiên Giang
  "Đại học An Giang",
  "Đại học Kiên Giang",

  // Các trường khác
  "Đại học Quốc phòng",
  "Đại học An ninh nhân dân",
  "Học viện Ngân hàng",
  "Học viện Tài chính",
  "Học viện Bưu chính Viễn thông",
  "Học viện Công nghệ Bưu chính Viễn thông",
  "Đại học Điện lực",
  "Đại học Dầu khí Việt Nam",
  "Đại học Hàng không Việt Nam",
  "Đại học Phạm Văn Đồng",
  "Đại học Quy Nhon",
  "Đại học Tây Đô",
  "Đại học Trà Vinh",
  "Đại học Tây Nguyên",
  "Đại học Yersin Đà Lạt",
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  // Insert categories - skip if name already exists
  await db
    .insert(categories)
    .values(categoriesData.map((name) => ({ name })))
    .onConflictDoNothing({ target: categories.name });

  await db
    .insert(blogCategories)
    .values(blogCategoriesData)
    .onConflictDoNothing({ target: blogCategories.name });

  const dataToInsert = universitiesData.map((uniName) => ({
    name: uniName,
    slug: slugify(uniName),
    type: OrganizationTypeEnum.UNIVERSITY,
  }));

  await db
    .insert(organizations)
    .values(dataToInsert)
    .onConflictDoNothing({ target: organizations.slug });

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
