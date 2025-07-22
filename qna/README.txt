# Stacked Pancakes - Q&A Platform for Chefs

A modern, server-rendered Q&A platform designed for chefs to ask questions, share knowledge, and build their cooking community.

By: Calvin Ng Jun Xing (A0282167Y)

## Features

- **Question & Answer System**: Ask questions, provide answers, and mark helpful responses as accepted answers
- **Tagging System**: Categorize questions with relevant tags for easy searching and filtering
- **Voting System**: Upvote valuable questions and answers using straightforward server-side processing
- **User Profiles**: Personalized profiles showing user activity with traditional form-based updates
- **Content Management**: Edit and delete your content through direct form submissions
- **Search Functionality**: (Additional) Find relevant questions and answers quickly with server-rendered search results
- **Guest Browsing Mode**: (Additional) Browse content freely as a visitor while contribution features (asking/answering questions, voting) remain exclusive to registered users
- **Input Validation**: (Additional) Server-side validation for all form submissions ensuring data integrity and security

## Technology Stack

- **Backend**: Node.js, Express.js, MongoDB, Express-Session
- **Frontend**: EJS templates, CSS3, minimal JavaScript
- **Authentication**: Session-based with HTTP-Only cookies

## Database Setup

### MongoDB Configuration

1. Install MongoDB on your system or use MongoDB Atlas cloud service
2. Create a new database named `qna`
3. The application will automatically create the following collections:
   - `users` - User accounts and profile information
   - `questions` - All questions with their details and votes
   - `answers` - All answers with their details and votes
   - `votes` - Vote records for questions and answers

### Database Schema

#### Users Collection
```
{
  _id: ObjectId,
  username: String,
  email: String,
  password: String (hashed),
  bio: String,
  profilePicture: String,
  createdAt: Date
}
```

#### Questions Collection
```
{
  _id: ObjectId,
  userId: ObjectId,
  title: String,
  body: String,
  tags: [String],
  createdAt: Date,
  updatedAt: Date,
  votes: {
    up: [ObjectId],
    down: [ObjectId]
  }
}
```

#### Answers Collection
```
{
  _id: ObjectId,
  userId: ObjectId,
  questionId: ObjectId,
  body: String,
  createdAt: Date,
  updatedAt: Date,
  votes: {
    up: [ObjectId],
    down: [ObjectId]
  }
}
```

#### Votes Collection
```
{
  _id: ObjectId,
  userId: ObjectId,
  questionId: ObjectId,
  answerId: ObjectId,
  voteType: String
}
```

## Installation & Deployment

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- MongoDB (v4 or higher)

### Local Development Setup

1. Clone the repository:
   ```
   git clone [repository-url]
   cd stacked-pancakes
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/qna
   SESSION_SECRET=your_session_secret_key
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Access the application at `http://localhost:3000`

### Production Deployment

1. Set appropriate environment variables on your hosting platform:
   - `PORT`: The port your application will run on (often assigned by the platform)
   - `MONGODB_URI`: Connection string to your MongoDB instance
   - `SESSION_SECRET`: A long, random string for session security
   - `NODE_ENV`: Set to "production"

2. Build and start the application:
   ```
   npm start
   ```

## Authentication

- User registration available at `/register`
- User login available at `/login`
- Sessions are maintained for 24 hours with activity
- Form validation ensures secure user credentials
- Input sanitization prevents injection attacks

## Data Validation

- Server-side validation for all user inputs
- Required field validation for essential information
- Length constraints to maintain data quality
- Special character filtering for security
- Appropriate error messages with clear user feedback

## Directory Structure

- `/public` - Static assets + template files (CSS, JavaScript, images)
- `/views` - EJS templates for all pages
- `/routes` - Application routes
- `/handlers` - Request handlers for each route
- `/lib` - Core functionality and database operations
