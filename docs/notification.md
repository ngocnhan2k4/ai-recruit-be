/**
 * Notification Documentation
 *
 * This documentation outlines the expected payload structure for each notification type.
 *
 * ### Notification Types and Payloads
 *
 * - **job_posted**: Sent when a new job is posted. (from user in org -> admin)
 *   - `senderId`: The ID of user posted job.
 *   - `receiverId`: The ID of all admin.
 *
 * - **job_approved**: Sent when a job posting is approved by an admin.
 *   - `senderId`: The ID of admin approved job.
 *   - `receiverId`: The ID of user posted job
 *   - `organizationId`: The ID of org posted job
 *
 * - **job_applied**: Sent to a company when a user applies for a job.
 *   - `senderId`: The ID of the job that was applied for.
 *   - `receiverId`: The ID of the user who applied.
 *   - `organizationId`: The ID of org that user who applied.
 *
 * - **job_matched**: Sent to a user when their profile matches a job opening.
 *   - `senderId`: The ID of the matched job.
 *   - `receiverId`: The ID of the user who was matched.
 *
 * - **profile_viewed**: Sent to a user when their profile is viewed by a company.
 *   - `senderId`: The ID of the user whose profile was viewed.
 *   - `receiverId`: The ID of the organization that viewed the profile.
 */

