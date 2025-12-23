# Quick Start Guide: Bulk Asset Operations

## 🎯 What's New?

Admins can now **bulk edit** and **bulk delete** multiple assets at once!

## 🔐 Who Can Use This?

**Admin users only** - If you're logged in as admin, you'll see checkboxes next to each asset.

## 📋 How to Use

### Step 1: Select Assets
```
☑️ Asset 1
☑️ Asset 2  
☑️ Asset 3
☐ Asset 4
```

**Tip**: Click the checkbox in the header to select/deselect all assets at once!

### Step 2: Choose Action

A floating bar appears at the bottom:
```
┌─────────────────────────────────────────┐
│  3 selected  │  Bulk Edit  │  Delete All  │  Clear  │
└─────────────────────────────────────────┘
```

### Step 3: Bulk Edit

Click **"Bulk Edit"** to update multiple assets:

**Editable Fields:**
- ✏️ Status (active, damaged, missing, maintenance)
- ✏️ Condition (excellent, good, fair, poor)
- ✏️ Category (dewatering, waterproofing, tiling, ppe, office)
- ✏️ Type (equipment, tools, consumable, non-consumable)
- ✏️ Location (any text)
- ✏️ Low Stock Level (number)
- ✏️ Critical Stock Level (number)

**Important**: Only fields you change will be updated. Blank fields are ignored.

### Step 4: Bulk Delete

Click **"Delete All"** to remove multiple assets:

⚠️ **Warning**: This action cannot be undone!

You'll see a confirmation dialog listing all assets to be deleted.

## 💡 Use Cases

### Example 1: Change Location for Multiple Items
1. Select all assets in "Warehouse A"
2. Click "Bulk Edit"
3. Change Location to "Warehouse B"
4. Click "Update X Asset(s)"
5. ✅ Done!

### Example 2: Mark Multiple Items as Damaged
1. Select damaged assets
2. Click "Bulk Edit"
3. Change Status to "Damaged"
4. Change Condition to "Poor"
5. Click "Update X Asset(s)"
6. ✅ Done!

### Example 3: Clean Up Old Assets
1. Select obsolete assets
2. Click "Delete All"
3. Review the list
4. Confirm deletion
5. ✅ Done!

## ⚡ Keyboard Tips

- **Select All**: Click checkbox in table header
- **Clear Selection**: Click "Clear" button or click header checkbox again

## 🔍 What Gets Logged?

All bulk operations are logged for audit purposes:
- What was changed
- How many items were affected
- Who made the change
- When it happened

Check the Activity Log in Company Settings to see the history.

## ❓ FAQ

**Q: Can I undo a bulk operation?**
A: Not yet. Always double-check before confirming!

**Q: What if I select 100 assets?**
A: It will work, but may take a few seconds to process.

**Q: Can I bulk edit quantities?**
A: Not yet. Use the Restock feature for quantity changes.

**Q: I don't see checkboxes. Why?**
A: Only admin users can see bulk operations. Check your user role.

**Q: Can I export selected assets?**
A: Not yet, but it's on the roadmap!

## 🚀 Pro Tips

1. **Use filters first** - Filter assets before selecting to avoid mistakes
2. **Start small** - Test with 2-3 assets before bulk editing many
3. **Check the preview** - Review the list before confirming
4. **Use descriptive locations** - Makes bulk editing easier later

---

**Need Help?** Contact your system administrator.
