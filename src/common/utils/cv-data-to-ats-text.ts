import { OptimizedCvDataDto } from "@/interfaces/dtos/ai-cv/res/ai-cv-base.dto";

/**
 * Directly formats the AI-optimized CV's structured data into linear plain
 * text, mimicking what an ATS parser would extract from the rendered PDF —
 * without actually rendering a PDF and re-extracting it.
 */
export function convertCvDataToAtsText(cvData: OptimizedCvDataDto): string {
  const sections: string[] = [];

  const personalInfo: string[] = [];
  if (cvData.personalInfo?.name) personalInfo.push(cvData.personalInfo.name);
  if (cvData.personalInfo?.email) personalInfo.push(cvData.personalInfo.email);
  if (cvData.personalInfo?.phone) personalInfo.push(cvData.personalInfo.phone);
  if (cvData.personalInfo?.location)
    personalInfo.push(cvData.personalInfo.location);
  if (cvData.personalInfo?.linkedin?.url)
    personalInfo.push(cvData.personalInfo.linkedin.url);
  if (cvData.personalInfo?.github?.url)
    personalInfo.push(cvData.personalInfo.github.url);
  if (personalInfo.length > 0) {
    sections.push(`PERSONAL INFORMATION\n${personalInfo.join("\n")}`);
  }

  if (cvData.summary) {
    sections.push(`SUMMARY\n${cvData.summary}`);
  }

  const experience = cvData.experience ?? [];
  if (experience.length > 0) {
    const experienceText = experience
      .map((exp) => {
        const lines: string[] = [];
        const header = exp.company
          ? `${exp.position} at ${exp.company}`
          : exp.position;
        lines.push(`${header} (${exp.startDate} - ${exp.endDate})`);
        for (const achievement of exp.achievements ?? []) {
          lines.push(`- ${achievement}`);
        }
        return lines.join("\n");
      })
      .join("\n\n");
    sections.push(`EXPERIENCE\n${experienceText}`);
  }

  const projects = cvData.projects ?? [];
  if (projects.length > 0) {
    const projectsText = projects
      .map((proj) => {
        const lines: string[] = [];
        lines.push(proj.url ? `${proj.name} (${proj.url})` : (proj.name ?? ""));
        if (proj.description) lines.push(proj.description);
        const technologies = proj.technologies ?? [];
        if (technologies.length > 0) {
          lines.push(`Technologies: ${technologies.join(", ")}`);
        }
        return lines.join("\n");
      })
      .join("\n\n");
    sections.push(`PROJECTS\n${projectsText}`);
  }

  const education = cvData.education ?? [];
  if (education.length > 0) {
    const educationText = education
      .map((edu) => {
        const degreeField = [edu.degree, edu.field].filter(Boolean).join(", ");
        const header = degreeField
          ? `${degreeField} — ${edu.institution}`
          : edu.institution;
        return `${header} (${edu.startDate} - ${edu.endDate})`;
      })
      .join("\n\n");
    sections.push(`EDUCATION\n${educationText}`);
  }

  const skillsLines: string[] = [];
  for (const group of cvData.skills?.technical ?? []) {
    const items = group.items ?? [];
    if (items.length > 0) {
      skillsLines.push(`${group.category}: ${items.join(", ")}`);
    }
  }
  const softSkills = cvData.skills?.soft ?? [];
  if (softSkills.length > 0) {
    skillsLines.push(`Soft Skills: ${softSkills.join(", ")}`);
  }
  if (skillsLines.length > 0) {
    sections.push(`SKILLS\n${skillsLines.join("\n")}`);
  }

  return sections.join("\n\n");
}
