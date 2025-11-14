# Fringe Feature - UI Implementation Guide

## ✅ Completed
1. Database schema (`prisma/schema.prisma`) - FringeRule model added
2. Server actions (`app/actions/fringe.ts`) - CRUD operations complete
3. Calculation logic (`app/actions/projects.ts:391-400`) - Fringe preserved in estimates
4. Backend data fetching (`app/actions/projects.ts:201-280`) - Fringe data included in queries
5. TypeScript interfaces (`app/(dashboard)/projects/[id]/page.tsx:13-55`) - FringeRuleData interface added
6. Migration file (`prisma/migrations/add-fringe-support.sql`) - Ready and executed

## 🔨 Remaining UI Work

### 1. Add State Management for Fringe Rules

Add these state variables after line ~70 in `app/(dashboard)/projects/[id]/page.tsx`:

```typescript
const [showFringeForm, setShowFringeForm] = useState(false);
const [fringeName, setFringeName] = useState("");
const [fringePercentage, setFringePercentage] = useState("");
const [editingFringeId, setEditingFringeId] = useState<string | null>(null);
```

### 2. Add Fringe Management Card

Add this card after the "Insurance & Production Fee" card (around line 372):

```typescript
{/* Fringe Rules */}
<div className="bg-white rounded-xl p-6 border border-gray-200">
  <div className="flex items-center justify-between mb-3">
    <p className="text-sm text-gray-600">Fringe Rules</p>
    {activeTab === "estimate" && (
      <button
        onClick={() => {
          setShowFringeForm(true);
          setEditingFringeId(null);
          setFringeName("");
          setFringePercentage("");
        }}
        className="text-xs text-green-600 hover:text-green-700"
      >
        + Add
      </button>
    )}
  </div>

  {/* Fringe Rules List */}
  <div className="space-y-2">
    {project.fringeRules.length === 0 ? (
      <p className="text-xs text-gray-400">No fringe rules</p>
    ) : (
      project.fringeRules.map((rule) => (
        <div key={rule.id} className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-600">{rule.name}:</span>
          <span className="text-xs font-medium">{rule.percentage}%</span>
          {activeTab === "estimate" && (
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setEditingFringeId(rule.id);
                  setFringeName(rule.name);
                  setFringePercentage(rule.percentage.toString());
                  setShowFringeForm(true);
                }}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Edit
              </button>
              <button
                onClick={async () => {
                  if (confirm(`Delete fringe rule "${rule.name}"?`)) {
                    await deleteFringeRule(rule.id);
                    loadData();
                  }
                }}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      ))
    )}
  </div>

  {/* Fringe Form Modal */}
  {showFringeForm && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {editingFringeId ? "Edit" : "Add"} Fringe Rule
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={fringeName}
              onChange={(e) => setFringeName(e.target.value)}
              placeholder="e.g., Fringe A"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Percentage (%)
            </label>
            <input
              type="number"
              value={fringePercentage}
              onChange={(e) => setFringePercentage(e.target.value)}
              placeholder="e.g., 15.5"
              step="0.01"
              min="0"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={() => {
              setShowFringeForm(false);
              setEditingFringeId(null);
              setFringeName("");
              setFringePercentage("");
            }}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              const percentage = parseFloat(fringePercentage);
              if (!fringeName || isNaN(percentage)) {
                alert("Please enter a valid name and percentage");
                return;
              }

              if (editingFringeId) {
                await updateFringeRule(editingFringeId, fringeName, percentage);
              } else {
                await createFringeRule(project.id, fringeName, percentage);
              }

              setShowFringeForm(false);
              setEditingFringeId(null);
              setFringeName("");
              setFringePercentage("");
              loadData();
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {editingFringeId ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  )}
</div>
```

### 3. Update Grid Layout

Change line ~314 from `grid-cols-5` to `grid-cols-6` to accommodate the new Fringe card:

```typescript
<div className="grid grid-cols-6 gap-6 mb-8">
```

### 4. Add Fringe Assignment to Budget Line Rows

In the budget line table rows (look for where payee dropdown is rendered), add a Fringe column and dropdown. Find the table header and add:

```typescript
<th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Fringe</th>
```

Then in the table body rows, add:

```typescript
<td className="px-3 py-2 text-xs border-r border-gray-300">
  {activeTab === "estimate" ? (
    <select
      value={line.fringeRuleId || ""}
      onChange={async (e) => {
        const fringeRuleId = e.target.value || null;
        await assignFringeToLine(line.id, fringeRuleId);
        loadData();
      }}
      className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
    >
      <option value="">None</option>
      {project.fringeRules.map((rule) => (
        <option key={rule.id} value={rule.id}>
          {rule.name} ({rule.percentage}%)
        </option>
      ))}
    </select>
  ) : (
    <span className="text-gray-900">
      {line.fringeRule ? `${line.fringeRule.name} (${line.fringeRule.percentage}%)` : "-"}
    </span>
  )}
</td>
```

## Testing Checklist

After implementing:

1. **Create Fringe Rules**
   - Click "+ Add" in Fringe Rules card
   - Create 2-3 fringe rules with different percentages
   - Verify they appear in the list

2. **Edit/Delete Fringe Rules**
   - Edit a fringe rule name and percentage
   - Delete a fringe rule
   - Verify changes persist

3. **Assign Fringe to Lines**
   - In Estimate view, select a fringe rule for a budget line
   - Verify estimate updates automatically (includes fringe amount)
   - Check that Grand Total reflects the fringe

4. **Running View**
   - Switch to Running tab
   - Verify fringe is displayed as read-only
   - Confirm fringe info shows in the correct column

5. **Persistence**
   - Refresh page
   - Verify all fringe assignments remain
   - Check estimates are still correct

## File Locations

- Main page: `/app/(dashboard)/projects/[id]/page.tsx`
- Server actions: `/app/actions/fringe.ts`
- Schema: `/prisma/schema.prisma`
- Migration: `/prisma/migrations/add-fringe-support.sql`
