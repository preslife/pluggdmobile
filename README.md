PLUGGD -
About The Project

This project provides the foundational data structure for a multi-faceted music ecosystem. The schema supports a wide range of functionalities, from selling beats and managing releases to hosting producer battles, offering educational courses, and fostering a vibrant community. The platform is designed to handle complex relationships between users, content, sales, and social interactions.
Key Features
The database schema supports a rich feature set, including:
• User & Profile Management: Robust profiles for artists and labels, including bios, social links, verification status, and user stats.
• Music & Content Hosting: Detailed tables for managing releases, tracks, beats, audio files, and sample packs.
• E-commerce & Monetisation: A complete sales and payout system including beat sales, release purchases, orders, subscriptions, artist tips, and payout records for producers. Producers can connect Stripe accounts for payouts.
• Community & Social Engagement: Features for building a community, such as posts, comments, likes, user follows, activity feeds, and collaborative playlists.
• Creator Tools: A suite of tools for creators including automations for social posts, a unified inbox for messages, and smartlinks for releases/beats.
• Analytics & Insights: In-depth analytics for artists, releases, and audience demographics, as well as metrics on creator revenue and engagement.
• Competitions & Challenges: A framework for hosting beat battles, contests, and monthly challenges to drive user engagement, complete with entries, voting, and prize pools.
• Collaboration Hub: Functionality to support collaboration projects, session rooms for live interaction, and detailed tracking of collaborators on beats and releases.
• Licensing & Contracts: A system for managing beat licenses, contract templates, and digital contract signing.
• Educational Content: A learning management system for creating and selling courses, tracking user progress, and issuing certificates.
• Creator Stores: The ability for creators to sell custom merchandise, digital bundles, and unique collectibles directly to their fans.
• Professional Directory & Bookings: A directory for verified music professionals where clients can submit booking requests.
• Label Management: Tools for music labels to manage their members, invite new users, and handle ownership transfers.
• Administration & Moderation: Comprehensive tools for content reporting, moderation actions, and system security auditing.
Database Schema Overview
This schema is designed for a PostgreSQL database, specifically for use with the Supabase platform. It defines over 100 tables that create a relational data model for a music-focused application. The structure revolves around core entities such as users (auth.users), profiles, beats, releases, and various transaction or event tables that link them together.
Core Tables
Below is a selection of key tables and their primary functions:
• public.profiles: Stores extended user information beyond the authentication record, such as username, bio, avatar, and user type.
• public.releases: Contains metadata for music releases like singles, EPs, and albums, including artist info, release date, and distribution links.
• public.beats: Manages beats created by producers, including details like title, genre, BPM, price, and audio file locations.
• public.beat_sales: Records every transaction involving the sale of a beat, detailing the buyer, producer, price, and commission.
• public.purchases: A central table for tracking user purchases of beats, including payment status and licensing information.
• public.community_posts: The foundation for the social feed, allowing creators to post text and media.
• public.battles: Manages beat battle competitions, including schedules, entry fees, and prize pools.
• public.licensing_contracts: Handles the generation and status of legal contracts between producers and artists for beat licenses.
• public.courses: Defines educational courses offered on the platform, including instructor and content details.
• public.labels: Manages information about record labels on the platform, including members and ownership.
• public.api_tokens: Allows for the generation of API tokens for users to interact with the platform programmatically.
Getting Started
To use this schema, you can inspect the SQL files in this repository to understand the data architecture. The primary schema definition provides the table structures, constraints, and relationships needed to power the application's backend.
This section can be expanded with instructions on how to set up the database, run migrations, and connect the application.
Disclaimer
Warning: The schema provided in this repository is for contextual understanding and architectural reference only. It is not guaranteed to be executable in its current state. The order of table creation and the dependencies between them may not be valid for direct execution.
