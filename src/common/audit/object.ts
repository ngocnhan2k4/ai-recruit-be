export enum ObjectType {
  JOB = 1,
  ORGANIZATION = 2,
  USER = 3,
}

export const includesPath = ["/jobs", "/jobs/:id"];

export const objectTypeMap: Record<string, ObjectType> = {
  "/jobs": ObjectType.JOB,
  "/jobs/:id": ObjectType.JOB,
  "/organizations": ObjectType.ORGANIZATION,
  "/organizations/:id": ObjectType.ORGANIZATION,
  "/users": ObjectType.USER,
  "/users/:id": ObjectType.USER,
};
