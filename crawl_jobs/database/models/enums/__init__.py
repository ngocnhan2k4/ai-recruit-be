from enum import Enum

class OrganizationType(str, Enum):
    COMPANY = "company"
    SCHOOL = "school"
    NONPROFIT = "nonprofit"
    UNIVERSITY = "university"

class WorkType(str, Enum):
    REMOTE = "remote"
    ONSITE = "onsite"
    HYBRID = "hybrid"

class JobStatus(str, Enum):
    PENDING_APPROVAL = "pending_approval"
    ACTIVE = "active"
    PAUSED = "paused"
    CLOSED = "closed"
    REJECTED = "rejected"