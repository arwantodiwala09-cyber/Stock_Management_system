export async function generateDocumentNumber(db, table, field, orgId, prefix) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let attempts = 0;
    while (attempts < 10) {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const candidate = `${prefix}-${dateStr}-${randomSuffix}`;
        const { data } = await db
            .from(table)
            .select('id')
            .eq('organization_id', orgId)
            .eq(field, candidate)
            .maybeSingle();
        if (!data) {
            return candidate;
        }
        attempts++;
    }
    return `${prefix}-${dateStr}-${Date.now().toString().slice(-4)}`;
}
//# sourceMappingURL=numbering.js.map