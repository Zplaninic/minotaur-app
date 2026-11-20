import styles from "./TableSkeleton.module.css";

type TableSkeletonProps = {
  label: string;
  columns: number;
  rows?: number;
};

// Cell widths vary so the placeholder reads like text, not a grid of blocks.
const WIDTHS = ["70%", "45%", "85%", "55%", "65%", "40%"];
const widthAt = (row: number, column: number) => WIDTHS[(row * 2 + column) % WIDTHS.length];

// A table-shaped placeholder that keeps the page layout steady while rows load.
export const TableSkeleton = ({ label, columns, rows = 6 }: TableSkeletonProps) => (
  <output className={styles.wrapper}>
    <span className={styles.label}>{label}</span>
    <div className={styles.table} aria-hidden="true" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {Array.from({ length: columns }, (_, column) => (
        <div key={`head-${column}`} className={styles.head}>
          <span className={styles.bar} style={{ width: "50%" }} />
        </div>
      ))}
      {Array.from({ length: rows * columns }, (_, index) => {
        const row = Math.floor(index / columns);
        const column = index % columns;
        return (
          <div key={index} className={styles.cell}>
            <span className={styles.bar} style={{ width: widthAt(row, column) }} />
          </div>
        );
      })}
    </div>
  </output>
);
