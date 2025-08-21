# Competitive Programming Platform

A modern, AI-enhanced competitive programming website built with Next.js, TypeScript, and Monaco Editor.

## Features

- **Monaco Editor Integration**: Professional code editor with Python syntax highlighting
- **Problem Display**: Clear problem statements with difficulty levels and tags
- **Test Cases**: Visual representation of input/output with explanations
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Modern UI**: Built with Shadcn UI components for consistent design
- **TypeScript**: Full type safety and better development experience

## Tech Stack

- **Frontend**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI + Radix UI
- **Code Editor**: Monaco Editor (VS Code's editor)
- **State Management**: React hooks (useState, useEffect)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd startup
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── globals.css          # Global styles and custom CSS
│   ├── layout.tsx           # Root layout component
│   └── page.tsx             # Main page component
├── components/
│   ├── ui/                  # Shadcn UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── badge.tsx
│   └── ProblemEditor.tsx    # Main problem editor component
└── lib/
    └── utils.ts             # Utility functions
```

## Current Implementation

### Problem Editor Component

The `ProblemEditor` component includes:

- **Problem Information**: Name, difficulty level, and tags
- **Problem Description**: Full problem statement with examples and constraints
- **Test Cases**: Input/output pairs with explanations
- **Monaco Editor**: Python code editor with syntax highlighting
- **Action Buttons**: Hint and Submit buttons (functionality to be implemented)

### Sample Problem

Currently displays the "Two Sum" problem as a demonstration:
- Easy difficulty level
- Array, Hash Table, and Two Pointers tags
- Complete problem description with examples
- Three test cases with explanations

## Next Steps

The following features are planned for future implementation:

1. **Hint System**: AI-powered hints and guidance
2. **Code Submission**: Code execution and testing
3. **Problem Database**: Multiple problems with different difficulty levels
4. **User Authentication**: User accounts and progress tracking
5. **Leaderboard**: Competition and ranking system
6. **AI Code Review**: Automated feedback and suggestions

## Development

### Code Style

- Follows Standard.js rules
- Uses functional components with hooks
- Implements proper TypeScript types
- Follows React best practices

### Adding New Problems

To add new problems, modify the `sampleProblem` object in `ProblemEditor.tsx` or create a problems database.

### Styling

The project uses Tailwind CSS with custom CSS variables. Custom styles are defined in `globals.css`.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or support, please open an issue in the repository.
