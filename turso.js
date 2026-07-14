const TURSO_URL = 'https://faby-caceres-barberia-juycode.aws-ap-south-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQwNTQ1NDIsImlkIjoiMDE5ZjYxZDQtZDcwMS03ZWE1LTgwM2YtNDExMzk0Mzk2NDc4Iiwia2lkIjoiNkhqZ1ZhSjRucjZqd3k4UlJtR00td3BiaHNrQ0pfdE5KYnFseUFSaGhWYyIsInJpZCI6ImZhNjM0ZmM1LWEzODgtNGFmNy04ZWI5LTA2NGY0N2FlMGU5NyJ9.Ge85RKfx53PC5hY_uPHLhBd4Uhr1Oytpdy6B9zoG_PJcN48fk4E9T30ODoUxqLTasgDn8QnfSNsQnyEdAS54BA';

async function tursoQuery(sql, args = []) {
    const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TURSO_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            requests: [{
                type: 'execute',
                stmt: {
                    sql,
                    args: args.map(a => ({ type: 'text', value: String(a) }))
                }
            }]
        }),
    });

    const data = await res.json();
    const result = data.results?.[0]?.response?.result;
    if (!result) return [];

    const cols = result.cols.map(c => c.name);
    return (result.rows || []).map(row => {
        const obj = {};
        cols.forEach((col, i) => { obj[col] = row[i]?.value ?? null; });
        return obj;
    });
}