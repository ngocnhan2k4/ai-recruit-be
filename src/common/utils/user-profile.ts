import { User, UserCvData } from "@/core/entities";

/**
 * Converts UserCvData to a text format suitable for AI CV optimization
 * @param cvData - User CV data from repository
 * @returns Formatted text representation of the user's CV
 */
export function userCvDataToText(cvData: UserCvData): string {
  const sections: string[] = [];

  // Personal Information
  const personalInfo: string[] = [];
  if (cvData.name) personalInfo.push(`Name: ${cvData.name}`);
  if (cvData.email) personalInfo.push(`Email: ${cvData.email}`);
  if (cvData.phone) personalInfo.push(`Phone: ${cvData.phone}`);
  if (cvData.address) personalInfo.push(`Address: ${cvData.address}`);

  if (personalInfo.length > 0) {
    sections.push(`PERSONAL INFORMATION\n${personalInfo.join("\n")}`);
  }

  // Bio/Summary
  if (cvData.bio) {
    sections.push(`SUMMARY\n${cvData.bio}`);
  }

  // Skills
  if (cvData.skills.length > 0) {
    sections.push(`SKILLS\n${cvData.skills.join(", ")}`);
  }

  // Work Experience
  if (cvData.experiences.length > 0) {
    const experienceText = cvData.experiences
      .map((exp) => {
        const lines: string[] = [];
        lines.push(`${exp.jobTitle} - ${exp.position}`);
        lines.push(`${exp.organizationName}`);
        lines.push(`${exp.startDate} - ${exp.endDate || "Present"}`);
        if (exp.description) {
          lines.push(exp.description);
        }
        return lines.join("\n");
      })
      .join("\n\n");

    sections.push(`WORK EXPERIENCE\n${experienceText}`);
  }

  // Education
  if (cvData.educations.length > 0) {
    const educationText = cvData.educations
      .map((edu) => {
        const lines: string[] = [];
        if (edu.degree) lines.push(edu.degree);
        if (edu.major) lines.push(`Major: ${edu.major}`);
        lines.push(edu.schoolName);
        if (edu.startDate || edu.endDate) {
          lines.push(`${edu.startDate || ""} - ${edu.endDate || "Present"}`);
        }
        return lines.join("\n");
      })
      .join("\n\n");

    sections.push(`EDUCATION\n${educationText}`);
  }

  return sections.join("\n\n---\n\n");
}

export const buildDeletedEmail = (
  user: User,
  timestampMs: number,
): string | null => {
  if (!user.email) return null;
  const localPart = user.email.split("@")[0] || "user";
  const safeLocalPart = localPart.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 40);
  return `deleted+${safeLocalPart}.${user.id}.${timestampMs}@anon.local`;
};

export const buildDeletedPhone = (
  user: User,
  timestampMs: number,
): string | null => {
  if (!user.phone) return null;
  const digits = user.phone.replace(/\D/g, "");
  const suffix = digits.slice(-4) || "0000";
  return `deleted${String(timestampMs).slice(-10)}${suffix}`.slice(0, 20);
};

export const buildDeletedFirebaseUid = (
  user: User,
  timestampMs: number,
): string | null => {
  if (!user.firebaseUid) return null;
  return `deleted_${user.id}_${timestampMs}`;
};
