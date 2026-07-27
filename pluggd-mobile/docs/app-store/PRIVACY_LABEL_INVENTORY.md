# App Privacy Label Inventory

This inventory must match App Store Connect and `ios/Pluggd/PrivacyInfo.xcprivacy`.

| Data type | Linked to user | Tracking | Purpose |
|---|---:|---:|---|
| Name | Yes | No | App functionality |
| Email address | Yes | No | Account authentication and support |
| User ID | Yes | No | Account, safety and entitlement state |
| Purchase history | Yes | No | Credits, memberships, restore and fraud prevention |
| Photos or videos | Yes | No | User-selected profile and community media |
| Audio data | Yes | No | User-uploaded music and live audio |
| Other user content | Yes | No | Posts, comments, messages and reports |
| Product interaction | Yes | No | Core functionality and aggregate product analytics |

PLUGGD does not declare tracking and does not use data from the iOS app to track a person across other companies’ apps or websites for advertising. If a future SDK changes this behaviour, both this inventory and App Store Connect must be updated before that build.

Required-reason APIs declared by the native privacy manifest:

- File timestamps: C617.1, 0A2A.1, 3B52.1
- User defaults: CA92.1
- Disk space: E174.1, 85F4.1
- System boot time: 35F9.1
