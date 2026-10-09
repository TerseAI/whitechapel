import type { SourcePage } from '../../../shared/story/types';
export function SourceTranscription({ page }: { page: SourcePage }) {
  return <>
    {(page.heading || page.kicker || page.date) && <header className="source-heading">
      {page.kicker && <p className="source-kicker">{page.kicker}</p>}
      {page.heading && <h3>{page.heading}</h3>}
      {page.date && <p className="source-date">{page.date}</p>}
    </header>}
    {page.fields && <dl className="source-fields">{page.fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
    {page.table && <SourceTable table={page.table}/>}
    {page.paragraphs?.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    {page.signature && <p className="source-signature">{page.signature}</p>}
    {page.marginalia && <p className="source-marginalia">{page.marginalia}</p>}
  </>;
}

function SourceTable({ table }: { table: NonNullable<SourcePage['table']> }) {
  return <div className="source-table-wrap" tabIndex={0} aria-label="Document table"><table className="source-table">
    <thead><tr>{table.columns.map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead>
    <tbody>{table.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, column) => <td key={column}>{cell}{table.annotation?.row === rowIndex && table.annotation.column === column && <span className="ledger-addition">{table.annotation.text}<span className="sr-only"> (added in a different hand)</span></span>}</td>)}</tr>)}</tbody>
  </table></div>;
}
