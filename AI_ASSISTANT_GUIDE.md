# AI Assistant Feature Guide

## Overview

The AI Assistant is an **offline, role-based natural language interface** for executing tasks in the inventory management system. It uses the `compromise` NLP library to parse user inputs locally without requiring an internet connection.

## Features

### ✅ Fully Offline
- All NLP processing happens locally on your device
- No external API calls or internet connectivity required
- Uses the lightweight `compromise` library for natural language understanding

### 🔒 Role-Based Permissions
- Respects user role permissions (admin, data_entry_supervisor, regulatory, manager, staff)
- Prevents unauthorized actions based on user role
- Provides clear feedback when permissions are lacking

### 🎯 Supported Tasks

#### 1. **Create Waybills**
```
"Create a waybill for Site A with 5 water pumps"
"Send 10 cement bags to Construction Site B"
"Dispatch materials to Site C with driver John"
```

#### 2. **Add Assets**
```
"Add 50 bags of cement to inventory"
"Create asset Water Pump with 10 units"
"Add 25 liters of diesel as consumable"
```

#### 3. **Process Returns**
```
"Process return from Site A"
"Receive back items from Construction Site B"
```

#### 4. **Check Inventory**
```
"Check inventory levels"
"How many water pumps do we have?"
"Show stock at Site A"
"Inventory for cement bags"
```

#### 5. **View Analytics**
```
"Show analytics for equipment"
"View statistics for Site A"
"Display consumable analytics"
```

#### 6. **Create Sites**
```
"Create site called New Construction at downtown"
"Add site Project X"
```

## How to Use

### 1. **Open the AI Assistant**
- Click the floating **bot icon** button in the bottom-right corner of the screen
- The AI chat interface will open in a dialog

### 2. **Type Your Request**
- Use natural language to describe what you want to do
- Be specific about items, quantities, and sites
- The AI will extract relevant information from your message

### 3. **Review and Confirm**
- The AI will parse your request and show:
  - Intent badge (e.g., "Create Waybill", "Add Asset")
  - Confidence level (percentage)
  - Action button to proceed
- Click the action button to execute or open the relevant form

### 4. **Provide Missing Information**
- If the AI needs more details, it will ask clarifying questions
- Provide the requested information in your next message

## Intent Recognition

The AI identifies intents using pattern matching:

| Intent | Keywords | Examples |
|--------|----------|----------|
| Create Waybill | "create waybill", "send", "dispatch" | "send items to site", "create waybill for..." |
| Add Asset | "add asset", "create asset", "add item" | "add 10 pumps", "create asset cement" |
| Process Return | "process return", "return from", "receive back" | "return from Site A", "receive items back" |
| Check Inventory | "check inventory", "show stock", "how many" | "check stock levels", "how many pumps?" |
| View Analytics | "show analytics", "view analytics", "report" | "show site analytics", "equipment report" |
| Create Site | "create site", "add site", "new site" | "create site Project X", "add new site" |

## Parameter Extraction

The AI automatically extracts:

- **Site names**: Matches against existing sites in your database
- **Asset names**: Identifies items from your inventory
- **Quantities**: Extracts numbers from your message
- **Employees**: Matches driver/employee names
- **Vehicles**: Identifies vehicle registration numbers
- **Purposes**: Extracts text after "for" or "to"

## Permission Requirements

| Action | Admin | Data Entry Supervisor | Regulatory | Manager | Staff |
|--------|-------|---------------------|-----------|---------|-------|
| Create Waybill | ✅ | ✅ | ❌ | ✅ | ❌ |
| Add Asset | ✅ | ✅ | ❌ | ✅ | ❌ |
| Process Return | ✅ | ✅ | ❌ | ✅ | ❌ |
| Check Inventory | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Analytics | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Site | ✅ | ❌ | ❌ | ❌ | ❌ |

## Tips for Best Results

### ✅ Do:
- Be specific about item names and quantities
- Use exact site names from your database
- Include all relevant details in one message
- Use natural, conversational language

### ❌ Avoid:
- Vague requests without specific items or sites
- Misspelled item or site names
- Requesting multiple unrelated actions in one message
- Using ambiguous pronouns ("it", "this", "that")

## Examples

### Good Examples ✅

```
"Create a waybill for Lekki Site with 5 submersible pumps for drainage work"
```
✅ Clear intent, specific site, quantity, item, and purpose

```
"Add 100 bags of cement to inventory"
```
✅ Clear intent, quantity, and item

```
"Check inventory at Marina Construction Site"
```
✅ Clear intent and specific site

### Poor Examples ❌

```
"Send some stuff there"
```
❌ No specific items, quantities, or site

```
"Add materials"
```
❌ No specific item or quantity

```
"Check it"
```
❌ Unclear what to check

## Troubleshooting

### "I need more information about..."
The AI couldn't extract required parameters from your message. Provide the missing information in a follow-up message or rephrase with more details.

### "You don't have permission to perform this action"
Your user role doesn't allow this action. Contact an administrator if you need additional permissions.

### "I'm not sure what you want me to do"
The AI couldn't identify a clear intent. Try rephrasing using keywords from the "Intent Recognition" table above.

### Intent not recognized correctly
The AI uses pattern matching. If an intent is misidentified:
- Use more specific keywords
- Rephrase to match example patterns
- Split complex requests into multiple simpler ones

## Architecture

### Components

1. **AIAssistantService** (`src/services/aiAssistant.ts`)
   - Core NLP processing using `compromise` library
   - Intent identification and parameter extraction
   - Permission checking
   - Response generation

2. **AIAssistantContext** (`src/contexts/AIAssistantContext.tsx`)
   - React context for AI assistant state management
   - Message history
   - Action execution coordination

3. **AIAssistantChat** (`src/components/ai/AIAssistantChat.tsx`)
   - UI component for chat interface
   - Message display and input
   - Action buttons and suggestions

### Data Flow

```
User Input
    ↓
compromise NLP Parser
    ↓
Intent Identification
    ↓
Parameter Extraction
    ↓
Permission Check
    ↓
Response Generation
    ↓
UI Feedback / Action Execution
```

## Future Enhancements

Potential improvements for the AI Assistant:

- [ ] Form prefilling with extracted parameters
- [ ] Multi-step workflows (e.g., "Create waybill and send to site")
- [ ] Voice input support
- [ ] Learning from user corrections
- [ ] Context-aware suggestions based on recent activity
- [ ] Batch operations (e.g., "Add 10 different items")
- [ ] Advanced queries (e.g., "Show items low on stock at all sites")
- [ ] Export/import of conversation history
- [ ] Custom intent training per organization

## Technical Notes

- **Library**: `compromise` v14+ (offline NLP)
- **Bundle Size**: ~200KB added to application
- **Performance**: Intent parsing typically < 50ms
- **Privacy**: All data processing happens locally, no data sent to external servers
- **Compatibility**: Works in all modern browsers and Electron environments
