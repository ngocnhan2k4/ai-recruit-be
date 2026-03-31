export type SkillMatchResult = {
  skillId: string; // ID of the matched skill in the database
  resolvedName: string; // Synonym skill name from database (e.g., "JavaScript")
};

export type SynonymSkillResponse = {
  matches: Record<string, SkillMatchResult>; // Map of input skill name to array of matched skills
  pendingSkills: string[]; // List of skill names that need admin to review
};
