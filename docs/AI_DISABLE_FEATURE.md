# AI Assistant Disable Feature - Documentation

## Overview
You can now completely turn off AI assistance in your app through the Company Settings. When disabled, all AI features are hidden and inaccessible.

## How to Enable/Disable AI Assistant

### Steps:
1. Open your app
2. Navigate to **Settings** (from the sidebar)
3. Click on the **AI Assistant** tab
4. At the top of the page, you'll see a prominent toggle switch labeled **"Enable AI Assistant"**
5. Toggle it **OFF** to disable all AI features
6. Toggle it **ON** to re-enable AI features

## What Happens When AI is Disabled?

When you turn off AI assistance:

1. **Floating AI Button Hidden**: The floating AI assistant button (bottom-right corner) disappears completely
2. **AI Chat Disabled**: If someone tries to access the AI chat, they'll see a message explaining it's disabled
3. **Input Fields Locked**: All AI input fields and buttons become inactive
4. **Settings Persist**: Your AI disable/enable preference is saved in the database

## Visual Indicators

### In Company Settings:
- **When Enabled**: You'll see all AI configuration options (API keys, models, endpoints, etc.)
- **When Disabled**: A clean empty state with an icon and message directing you to enable AI

### In AI Chat:
- **When Enabled**: Normal chat interface with suggestions and input field
- **When Disabled**: 
  - Faded AI icon
  - Message: "AI Assistant is Disabled"
  - Instructions to enable it in Settings
  - Disabled input field with placeholder: "AI Assistant is disabled"
  - Help text: "Enable AI in Settings to use this feature"

## Technical Details

### Files Modified:

1. **src/components/settings/CompanySettings.tsx**
   - Added master toggle switch for AI enable/disable
   - Wrapped all AI settings in conditional rendering
   - Shows disabled state when AI is off

2. **src/pages/Index.tsx**
   - Added conditional rendering for floating AI button
   - Checks `companySettings.ai.remote.enabled` status

3. **src/components/ai/AIAssistantChat.tsx**
   - Added AI status check on mount
   - Shows disabled state UI when AI is off
   - Disables input fields and buttons when AI is off

### Data Storage:
- Setting is saved in: `company_settings.ai.remote.enabled` (boolean)
- When `enabled: false`, AI features are completely hidden
- When `enabled: true` or not set (default), AI features are available

## Benefits

✅ **Complete Control**: Fully control whether AI features are available in your app
✅ **Clean UI**: When disabled, AI features are completely hidden (not just disabled)
✅ **User-Friendly**: Clear messaging guides users on how to re-enable if needed
✅ **Persistent**: Your choice is saved and will persist across sessions
✅ **Safe**: No accidental AI usage when you don't want it

## Default Behavior

By default (when no setting is saved), AI features remain **enabled** to maintain backward compatibility with existing installations.
