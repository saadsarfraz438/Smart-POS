export default function PageListCard({  // export the component as default means you can import it without using curly braces and you can give it any name you want when importing it
  title,
  description,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  loading = false,
  loadingLabel = 'Loading...',
  emptyText = 'No records found.',
  action,
  children,
}) {
  return (
    <div className="card shadow-sm border-0 panel-card h-100">
      <div className="card-body">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
          <div>
            <h5 className="mb-1">{title}</h5>
            {description ? <p className="text-muted mb-0">{description}</p> : null}
          </div>
          <div className="d-flex align-items-center gap-2">
            {action}
            {onSearchChange ? (
              <div className="input-group search-box">
                <span className="input-group-text"><i className="bi bi-search" /></span>
                <input className="form-control" placeholder={searchPlaceholder} value={searchValue} onChange={onSearchChange} />
              </div>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-2 mb-0">{loadingLabel}</p>
          </div>
        ) : children ? (
          children
        ) : (
          <div className="text-center py-5 text-muted">{emptyText}</div>
        )}
      </div>
    </div>
  );
}
