# Casbin Authorization Setup Guide

This guide explains how Casbin is configured in your AI Recruit backend system with PostgreSQL database integration.

## Overview

Your system uses Casbin for Role-Based Access Control (RBAC) with support for:
- **Basic policies (ptype "p")**: Define what roles can do
- **Domain-based policies (ptype "p2")**: Organization-specific permissions
- **Basic role assignments (ptype "g")**: Assign roles to users
- **Domain-based role assignments (ptype "g2")**: Assign organization-specific roles

## Roles

The system supports the following roles (defined in `/src/common/constants/roles.ts`):

```typescript
export enum RoleEnum {
  // System-level roles
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  MODERATOR = "MODERATOR",
  USER = "USER",
  ANONYMOUS = "ANONYMOUS",
  
  // Organization-level roles
  ORGANIZATION_OWNER = "ORGANIZATION_OWNER",
  ORGANIZATION_ADMIN = "ORGANIZATION_ADMIN",
  ORGANIZATION_EDITOR = "ORGANIZATION_EDITOR",
  ORGANIZATION_VIEWER = "ORGANIZATION_VIEWER",
  
  // Organization content roles
  ORGANIZATION_CONTENT_ADMIN = "ORGANIZATION_CONTENT_ADMIN",
  ORGANIZATION_CONTENT_EDITOR = "ORGANIZATION_CONTENT_EDITOR",
  ORGANIZATION_CONTENT_VIEWER = "ORGANIZATION_CONTENT_VIEWER",
  
  // Organization recruiter roles
  ORGANIZATION_RECRUITER_ADMIN = "ORGANIZATION_RECRUITER_ADMIN",
  ORGANIZATION_RECRUITER_EDITOR = "ORGANIZATION_RECRUITER_EDITOR",
  ORGANIZATION_RECRUITER_VIEWER = "ORGANIZATION_RECRUITER_VIEWER",
  
  // Organization analyst roles
  ORGANIZATION_ANALYST_ADMIN = "ORGANIZATION_ANALYST_ADMIN",
  ORGANIZATION_ANALYST_EDITOR = "ORGANIZATION_ANALYST_EDITOR",
  ORGANIZATION_ANALYST_VIEWER = "ORGANIZATION_ANALYST_VIEWER",
  
  // Organization employee role
  ORGANIZATION_EMPLOYEE = "ORGANIZATION_EMPLOYEE",
}
```

## Database Structure

Casbin stores policies in PostgreSQL with the following structure:

```sql
CREATE TABLE casbin_rule (
    id SERIAL PRIMARY KEY,
    ptype VARCHAR(100),  -- Policy type: p, p2, g, g2
    v0 VARCHAR(100),     -- Subject/User
    v1 VARCHAR(100),     -- Object/Role  
    v2 VARCHAR(100),     -- Action/Domain
    v3 VARCHAR(100),     -- Effect/empty
    v4 VARCHAR(100),     -- empty
    v5 VARCHAR(100)      -- empty
);
```

### Example Records

#### System-Level Policies (ptype "p")

**SUPER_ADMIN - Full System Access**
```json
{
  "ptype": "p",
  "v0": "SUPER_ADMIN",
  "v1": "*",
  "v2": "(GET)|(POST)|(PUT)|(PATCH)|(DELETE)",
  "v3": "allow"
}
```

**ADMIN - Full System Access**
```json
{
  "ptype": "p",
  "v0": "ADMIN",
  "v1": "*",
  "v2": "(GET)|(POST)|(PUT)|(PATCH)|(DELETE)",
  "v3": "allow"
}
```

**MODERATOR - Blog Management**
```json
{
  "ptype": "p",
  "v0": "MODERATOR",
  "v1": "/api/v1/moderator/blog",
  "v2": "(GET)|(POST)|(PUT)|(PATCH)|(DELETE)",
  "v3": "allow"
}
```

**USER - Profile Management**
```json
{
  "ptype": "p",
  "v0": "USER",
  "v1": "/api/v1/users/profile",
  "v2": "(GET)|(PUT)",
  "v3": "allow"
}
```

#### Organization-Level Policies (ptype "p2")

**ORGANIZATION_OWNER - Full Organization Access**
```json
{
  "ptype": "p2",
  "v0": "ORGANIZATION_OWNER",
  "v1": "org",
  "v2": "/api/v1/organization/*",
  "v3": "(GET)|(POST)|(PUT)|(PATCH)|(DELETE)",
  "v4": "allow"
}
```

**ORGANIZATION_CONTENT_ADMIN - Content Management**
```json
{
  "ptype": "p2",
  "v0": "ORGANIZATION_CONTENT_ADMIN",
  "v1": "org",
  "v2": "/api/v1/organization/*/content/*",
  "v3": "(GET)|(POST)|(PUT)|(PATCH)|(DELETE)",
  "v4": "allow"
}
```

**ORGANIZATION_RECRUITER_EDITOR - Recruiter Editing**
```json
{
  "ptype": "p2",
  "v0": "ORGANIZATION_RECRUITER_EDITOR",
  "v1": "org",
  "v2": "/api/v1/organization/*/recruiter/*",
  "v3": "(GET)|(POST)|(PUT)|(PATCH)",
  "v4": "allow"
}
```

**ORGANIZATION_ANALYST_VIEWER - Analytics Viewing**
```json
{
  "ptype": "p2",
  "v0": "ORGANIZATION_ANALYST_VIEWER",
  "v1": "org",
  "v2": "/api/v1/organization/*/analytics/*",
  "v3": "(GET)",
  "v4": "allow"
}
```

#### Role Assignments (ptype "g" and "g2")

**Basic Role Assignment (ptype "g")**
```json
{
  "ptype": "g",
  "v0": "0028QiZXRGRl0dcQHUM35et60aq2",
  "v1": "ADMIN"
}
```

**Organization Role Assignment (ptype "g2")**
```json
{
  "ptype": "g2",
  "v0": "04iT59Ryz0v8eD54Omir5JNjCcdq",
  "v1": "ORGANIZATION_OWNER",
  "v2": "68512664fb59bbeddef04047"
}
```

## RBAC Model Configuration

The model is defined in `/casbin_conf/rbac_model.conf`:

```conf
[request_definition]
r = sub, obj, act
r2 = sub, org_id, obj, act

[policy_definition]
p = sub, obj, act, eft
p2 = sub, dom_type, obj, act, eft

[role_definition]
g = _, _
g2 = _, _, _

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))
e2 = some(where (p2.eft == allow)) && !some(where (p2.eft == deny))

[matchers]
m = keyMatch2(r.obj, p.obj) && regexMatch(r.act, p.act) && g(r.sub, p.sub)
m2 = (((g2(r2.sub, p2.sub, r2.org_id) || g2(r2.sub, p2.sub, "*")) && p2.dom_type == "org")) && keyMatch2(r2.obj, p2.obj) && regexMatch(r2.act, p2.act)
```

## API Endpoints

All endpoints require JWT authentication and proper Casbin permissions.

### Basic Policy Management

#### Add Policy (ptype "p")
```http
POST /api/v1/casbin/policy
Content-Type: application/json
Authorization: Bearer <token>

{
  "subject": "ADMIN",
  "object": "*",
  "action": "(GET)|(POST)|(PUT)|(PATCH)|(DELETE)",
  "effect": "allow"
}
```

#### Remove Policy (ptype "p")
```http
DELETE /api/v1/casbin/policy
Content-Type: application/json
Authorization: Bearer <token>

{
  "subject": "ADMIN",
  "object": "*",
  "action": "(GET)|(POST)|(PUT)|(PATCH)|(DELETE)",
  "effect": "allow"
}
```

### Domain-based Policy Management

#### Add Domain Policy (ptype "p2")
```http
POST /api/v1/casbin/policy2
Content-Type: application/json
Authorization: Bearer <token>

{
  "subject": "ORGANIZATION_OWNER",
  "domainType": "org",
  "object": "organization",
  "action": "(GET)|(PUT)|(PATCH)",
  "effect": "allow"
}
```

### Basic Role Management

#### Assign Role (ptype "g")
```http
POST /api/v1/casbin/role
Content-Type: application/json
Authorization: Bearer <token>

{
  "user": "0028QiZXRGRl0dcQHUM35et60aq2",
  "role": "USER"
}
```

#### Remove Role (ptype "g")
```http
DELETE /api/v1/casbin/role
Content-Type: application/json
Authorization: Bearer <token>

{
  "user": "0028QiZXRGRl0dcQHUM35et60aq2",
  "role": "USER"
}
```

### Domain-based Role Management

#### Assign Domain Role (ptype "g2")
```http
POST /api/v1/casbin/role-domain
Content-Type: application/json
Authorization: Bearer <token>

{
  "user": "04iT59Ryz0v8eD54Omir5JNjCcdq",
  "role": "ORGANIZATION_OWNER",
  "domain": "68512664fb59bbeddef04047"
}
```

### Query Endpoints

#### Get All Policies
```http
GET /api/v1/casbin/policies
Authorization: Bearer <token>
```

#### Get All Roles
```http
GET /api/v1/casbin/roles
Authorization: Bearer <token>
```

#### Get User Roles
```http
GET /api/v1/casbin/user/{userId}/roles
Authorization: Bearer <token>
```

#### Get User Roles in Domain
```http
GET /api/v1/casbin/user/{userId}/domain/{domain}/roles
Authorization: Bearer <token>
```

### Permission Checking

#### Check Basic Permission
```http
POST /api/v1/casbin/check
Content-Type: application/json
Authorization: Bearer <token>

{
  "subject": "ADMIN",
  "object": "*",
  "action": "GET"
}
```

#### Check Domain Permission
```http
POST /api/v1/casbin/check-domain
Content-Type: application/json
Authorization: Bearer <token>

{
  "subject": "ORGANIZATION_OWNER",
  "domain": "68512664fb59bbeddef04047",
  "object": "organization",
  "action": "PUT"
}
```

## Using Casbin in Controllers

### Protect Endpoints with Casbin

```typescript
import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { CasbinGuard } from "@/frameworks/auth-services/guards/casbin.guard";
import { CasbinPermission } from "@/frameworks/auth-services/casbin/casbin.decorator";

@Controller("users")
@UseGuards(JwtAuthGuard, CasbinGuard)
export class UserController {
  
  @Get()
  @CasbinPermission("users", "read")
  async getUsers() {
    // Only users with permission to "read" on "users" can access
    return this.userService.getUsers();
  }
  
  @Post()
  @CasbinPermission("users", "create")
  async createUser(@Body() data: CreateUserDto) {
    // Only users with permission to "create" on "users" can access
    return this.userService.createUser(data);
  }
}
```

### Use CasbinService in Code

```typescript
import { CasbinService } from "@/frameworks/auth-services/casbin/casbin.service";

@Injectable()
export class SomeService {
  constructor(private readonly casbinService: CasbinService) {}

  async checkUserPermission(userId: string, resource: string, action: string) {
    // Get user roles
    const roles = await this.casbinService.getRolesForUser(userId);
    
    // Check if user has permission
    const hasPermission = await this.casbinService.can(
      roles as RoleEnum[], 
      resource, 
      action
    );
    
    return hasPermission;
  }
  
  async assignRoleToUser(userId: string, role: string) {
    const result = await this.casbinService.addRoleForUser(userId, role);
    await this.casbinService.savePolicy();
    return result;
  }
  
  async assignOrgRole(userId: string, role: string, orgId: string) {
    const result = await this.casbinService.addRoleForUserInDomain(
      userId, 
      role, 
      orgId
    );
    await this.casbinService.savePolicy();
    return result;
  }
}
```

## Initial Setup

### Automated Policy Setup

Run the policy setup script to initialize all policies:

```bash
npx ts-node setup-casbin-policies.ts
```

This script will:
- Clear existing policies
- Create all system-level policies (ptype "p")
- Create all organization-level policies (ptype "p2")
- Save policies to database
- Verify the setup

### Manual Policy Setup

#### 1. System-Level Policies

```http
POST /api/v1/casbin/policy
{
  "subject": "SUPER_ADMIN",
  "object": "*",
  "action": "(GET)|(POST)|(PUT)|(PATCH)|(DELETE)",
  "effect": "allow"
}

POST /api/v1/casbin/policy
{
  "subject": "ADMIN",
  "object": "*",
  "action": "(GET)|(POST)|(PUT)|(PATCH)|(DELETE)",
  "effect": "allow"
}

POST /api/v1/casbin/policy
{
  "subject": "MODERATOR",
  "object": "/api/v1/moderator/blog",
  "action": "(GET)|(POST)|(PUT)|(PATCH)|(DELETE)",
  "effect": "allow"
}

POST /api/v1/casbin/policy
{
  "subject": "USER",
  "object": "/api/v1/users/profile",
  "action": "(GET)|(PUT)",
  "effect": "allow"
}
```

#### 2. Organization-Level Policies

```http
POST /api/v1/casbin/policy2
{
  "subject": "ORGANIZATION_OWNER",
  "domainType": "org",
  "object": "/api/v1/organization/*",
  "action": "(GET)|(POST)|(PUT)|(PATCH)|(DELETE)",
  "effect": "allow"
}

POST /api/v1/casbin/policy2
{
  "subject": "ORGANIZATION_CONTENT_ADMIN",
  "domainType": "org",
  "object": "/api/v1/organization/*/content/*",
  "action": "(GET)|(POST)|(PUT)|(PATCH)|(DELETE)",
  "effect": "allow"
}

POST /api/v1/casbin/policy2
{
  "subject": "ORGANIZATION_RECRUITER_EDITOR",
  "domainType": "org",
  "object": "/api/v1/organization/*/recruiter/*",
  "action": "(GET)|(POST)|(PUT)|(PATCH)",
  "effect": "allow"
}
```

#### 3. Assign Roles to Users

```http
POST /api/v1/casbin/role
{
  "user": "<firebase-user-id>",
  "role": "ADMIN"
}

POST /api/v1/casbin/role-domain
{
  "user": "<firebase-user-id>",
  "role": "ORGANIZATION_OWNER",
  "domain": "<organization-id>"
}
```

#### 4. Verify Setup

```http
POST /api/v1/casbin/check
{
  "subject": "ADMIN",
  "object": "/api/v1/users",
  "action": "GET"
}

POST /api/v1/casbin/check-domain
{
  "subject": "ORGANIZATION_OWNER",
  "domain": "<organization-id>",
  "object": "/api/v1/organization/<organization-id>/users",
  "action": "GET"
}
```

## Matcher Patterns

The system uses these matcher patterns:

- **keyMatch2**: Matches paths with wildcards
  - `*` matches any path segment
  - Example: `/api/users/*` matches `/api/users/123`

- **regexMatch**: Matches actions with regex
  - Example: `(GET)|(POST)` matches GET or POST

## Best Practices

1. **Use Specific Permissions**: Define granular permissions rather than giving all access
2. **Separate Domain Policies**: Use ptype "p2" for organization-specific permissions
3. **Test Permissions**: Always test new policies before deploying
4. **Save After Changes**: Always call `savePolicy()` after adding/removing policies
5. **Reload When Needed**: Use the reload endpoint after making changes outside the API

## Troubleshooting

### Policy Not Working

1. Check if policy exists: `GET /api/v1/casbin/policies`
2. Check if role is assigned: `GET /api/v1/casbin/user/{userId}/roles`
3. Test permission: `POST /api/v1/casbin/check`
4. Reload policies: `POST /api/v1/casbin/reload`

### User Can't Access Resource

1. Verify user has correct role assigned
2. Check policy matches the resource path
3. Verify action matches (case-sensitive)
4. Check the matcher in `rbac_model.conf`

## Security Considerations

1. **Protect Casbin Endpoints**: Only admins should access Casbin management endpoints
2. **Validate User IDs**: Always validate user IDs before assigning roles
3. **Audit Changes**: Log all policy and role changes
4. **Regular Review**: Regularly review and audit permissions
5. **Principle of Least Privilege**: Grant minimum necessary permissions

## Migration from File-based to Database

The system now uses PostgreSQL instead of file-based storage:
- ✅ Policies are persisted in database
- ✅ Changes are immediately available to all instances
- ✅ No need to restart server after policy changes
- ✅ Automatic synchronization across multiple servers

