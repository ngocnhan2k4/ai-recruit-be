import type {
  JobCopilotChatBrief,
  JobCopilotChatBriefPatch,
} from "@/core/entities";

export const mergeJobCopilotBriefPatch = (
  current: JobCopilotChatBrief,
  patch: JobCopilotChatBriefPatch,
): JobCopilotChatBrief => {
  const merged = { ...current };
  const nextTitle = patch.title?.trim();
  const nextCategory = patch.category?.trim();
  const roleChanged =
    (nextTitle && nextTitle !== current.title) ||
    (nextCategory && nextCategory !== current.category);

  if (nextTitle) merged.title = nextTitle;
  if (patch.level) merged.level = patch.level;
  if (nextCategory) merged.category = nextCategory;
  if (patch.workType) merged.workType = patch.workType;
  if (patch.locations?.length) merged.locations = patch.locations;

  const nextRoleContext = patch.roleContext?.trim();
  if (nextRoleContext) {
    merged.roleContext = nextRoleContext;
  } else if (roleChanged) {
    delete merged.roleContext;
  }

  if (patch.salaryNegotiable === true) {
    merged.salaryNegotiable = true;
    delete merged.salaryMin;
    delete merged.salaryMax;
  } else if (
    patch.salaryNegotiable === false ||
    patch.salaryMin != null ||
    patch.salaryMax != null
  ) {
    merged.salaryNegotiable = false;
    if (patch.salaryMin != null) merged.salaryMin = patch.salaryMin;
    if (patch.salaryMax != null) merged.salaryMax = patch.salaryMax;
    if (merged.salaryMin == null && merged.salaryMax != null) {
      merged.salaryMin = merged.salaryMax;
    } else if (merged.salaryMax == null && merged.salaryMin != null) {
      merged.salaryMax = merged.salaryMin;
    } else if (
      merged.salaryMin != null &&
      merged.salaryMax != null &&
      merged.salaryMin > merged.salaryMax
    ) {
      [merged.salaryMin, merged.salaryMax] = [
        merged.salaryMax,
        merged.salaryMin,
      ];
    }
  }

  return merged;
};
