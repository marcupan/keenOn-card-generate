# Database Schema Documentation

This document provides a comprehensive overview of the database schema used in the KeenOn Card Generate service. It includes details about tables, columns, relationships, and constraints.

## Tables Overview

The database consists of the following main tables:

1. **users** - Stores user account information
2. **folders** - Stores folder information for organizing cards
3. **cards** - Stores card information with Chinese words and translations

## Entity Relationship Diagram

```
+----------------+       +----------------+       +----------------+
|     users      |       |    folders     |       |     cards      |
+----------------+       +----------------+       +----------------+
| id (PK)        |<----->| id (PK)        |<----->| id (PK)        |
| name           |       | name           |       | word           |
| email (unique) |       | description    |       | translation    |
| password       |       | user_id (FK)   |       | image          |
| role           |       | created_at     |       | sentence       |
| verified       |       | updated_at     |       | user_id (FK)   |
| verificationCode|       | deleted_at     |       | folder_id (FK) |
| created_at     |       +----------------+       | created_at     |
| updated_at     |                                | updated_at     |
| deleted_at     |                                | deleted_at     |
+----------------+                                +----------------+
```

## Detailed Table Descriptions

### users

Stores information about user accounts.

| Column           | Type         | Constraints               | Description                                     |
| ---------------- | ------------ | ------------------------- | ----------------------------------------------- |
| id               | UUID         | PK                        | Unique identifier for the user                  |
| name             | VARCHAR(100) | NOT NULL                  | User's full name                                |
| email            | VARCHAR      | NOT NULL, UNIQUE, INDEXED | User's email address (used for login)           |
| password         | VARCHAR      | NOT NULL                  | Hashed password                                 |
| role             | ENUM         | NOT NULL, DEFAULT 'user'  | User role (user, admin)                         |
| verified         | BOOLEAN      | NOT NULL, DEFAULT false   | Whether the user's email has been verified      |
| verificationCode | TEXT         | NULLABLE, INDEXED         | Code used for email verification                |
| created_at       | TIMESTAMP    | NOT NULL                  | When the user was created                       |
| updated_at       | TIMESTAMP    | NOT NULL                  | When the user was last updated                  |
| deleted_at       | TIMESTAMP    | NULLABLE                  | When the user was soft-deleted (null if active) |

#### Indexes:

- Primary Key: `id`
- Unique Index: `email_index` on `email`
- Index: `verificationCode_index` on `verificationCode`

#### Relationships:

- One-to-Many with `folders`: A user can have multiple folders
- One-to-Many with `cards`: A user can have multiple cards

### folders

Stores information about folders that organize cards.

| Column      | Type         | Constraints  | Description                                       |
| ----------- | ------------ | ------------ | ------------------------------------------------- |
| id          | UUID         | PK           | Unique identifier for the folder                  |
| name        | VARCHAR(100) | NOT NULL     | Folder name                                       |
| description | TEXT         | NULLABLE     | Optional folder description                       |
| user_id     | UUID         | FK, NOT NULL | Reference to the user who owns the folder         |
| created_at  | TIMESTAMP    | NOT NULL     | When the folder was created                       |
| updated_at  | TIMESTAMP    | NOT NULL     | When the folder was last updated                  |
| deleted_at  | TIMESTAMP    | NULLABLE     | When the folder was soft-deleted (null if active) |

#### Indexes:

- Primary Key: `id`
- Foreign Key: `user_id` references `users(id)` with CASCADE delete

#### Relationships:

- Many-to-One with `users`: Each folder belongs to one user
- One-to-Many with `cards`: A folder can contain multiple cards

### cards

Stores information about Chinese learning cards.

| Column      | Type         | Constraints       | Description                                     |
| ----------- | ------------ | ----------------- | ----------------------------------------------- |
| id          | UUID         | PK                | Unique identifier for the card                  |
| word        | VARCHAR(100) | NOT NULL, INDEXED | Chinese word                                    |
| translation | VARCHAR(100) | NOT NULL, INDEXED | English translation of the word                 |
| image       | TEXT         | NULLABLE          | URL or base64 of the card image                 |
| sentence    | TEXT         | NOT NULL          | Example sentence using the word                 |
| user_id     | UUID         | FK, NOT NULL      | Reference to the user who owns the card         |
| folder_id   | UUID         | FK, NOT NULL      | Reference to the folder containing the card     |
| created_at  | TIMESTAMP    | NOT NULL          | When the card was created                       |
| updated_at  | TIMESTAMP    | NOT NULL          | When the card was last updated                  |
| deleted_at  | TIMESTAMP    | NULLABLE          | When the card was soft-deleted (null if active) |

#### Indexes:

- Primary Key: `id`
- Index: `word_index` on `word`
- Index: `translation_index` on `translation`
- Foreign Key: `user_id` references `users(id)` with CASCADE delete
- Foreign Key: `folder_id` references `folders(id)` with CASCADE delete

#### Relationships:

- Many-to-One with `users`: Each card belongs to one user
- Many-to-One with `folders`: Each card belongs to one folder

## Data Integrity

The database implements several mechanisms to ensure data integrity:

1. **Soft Deletes**: All tables use soft deletes via the `deleted_at` column, allowing for data recovery and maintaining referential integrity.

2. **Cascading Deletes**: When a user is deleted, all their folders and cards are automatically deleted. When a folder is deleted, all cards in that folder are automatically deleted.

3. **Validation**: Entity validation is performed before insert and update operations to ensure data meets the defined constraints.

4. **Timestamps**: All records maintain creation and update timestamps for auditing purposes.

## Migrations

Database migrations are managed through TypeORM and can be found in the `src/migrations` directory. These migrations ensure that the database schema can be evolved over time while preserving data integrity.
