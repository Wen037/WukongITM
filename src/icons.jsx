// Inline SVG icons — small, line-style, 18px default
const Icon = ({ name, size = 18, stroke = 1.6, ...rest }) => {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...rest,
  };
  switch (name) {
    case "shield":
      return (<svg {...props}><path d="M12 3l8 3v6c0 4.5-3.2 8.4-8 9-4.8-.6-8-4.5-8-9V6l8-3z"/></svg>);
    case "shield-check":
      return (<svg {...props}><path d="M12 3l8 3v6c0 4.5-3.2 8.4-8 9-4.8-.6-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>);
    case "upload":
      return (<svg {...props}><path d="M12 16V4M12 4l-4 4M12 4l4 4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>);
    case "file":
      return (<svg {...props}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg>);
    case "scan":
      return (<svg {...props}><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>);
    case "wand":
      return (<svg {...props}><path d="M15 4V2M15 14v-2M8 9h2M20 9h2M17.8 11.8l1.4 1.4M11.8 5.8l1.4 1.4M17.8 6.2l1.4-1.4M3 21l9-9"/></svg>);
    case "x":
      return (<svg {...props}><path d="M18 6L6 18M6 6l12 12"/></svg>);
    case "check":
      return (<svg {...props}><path d="M5 12l5 5L20 7"/></svg>);
    case "trash":
      return (<svg {...props}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>);
    case "edit":
      return (<svg {...props}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>);
    case "settings":
      return (<svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>);
    case "database":
      return (<svg {...props}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 11v6c0 1.7 4 3 9 3s9-1.3 9-3v-6"/></svg>);
    case "globe":
      return (<svg {...props}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>);
    case "download":
      return (<svg {...props}><path d="M12 4v12M12 16l-4-4M12 16l4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>);
    case "save":
      return (<svg {...props}><path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v6h9V3M7 21v-7h10v7"/></svg>);
    case "plus":
      return (<svg {...props}><path d="M12 5v14M5 12h14"/></svg>);
    case "minimize":
      return (<svg {...props}><path d="M5 12h14"/></svg>);
    case "maximize":
      return (<svg {...props}><rect x="4" y="4" width="16" height="16" rx="1"/></svg>);
    case "restore":
      return (<svg {...props}><rect x="7" y="4" width="13" height="13" rx="1"/><path d="M4 7v13h13"/></svg>);
    case "alert":
      return (<svg {...props}><path d="M12 9v4M12 17h0"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>);
    case "eye":
      return (<svg {...props}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>);
    case "eye-off":
      return (<svg {...props}><path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c6.5 0 10 7 10 7a13.4 13.4 0 0 1-1.7 2.7M6.6 6.6C3.6 8.5 2 12 2 12s3.5 7 10 7c1.6 0 3.1-.4 4.4-1M2 2l20 20"/><path d="M14.1 14.1a3 3 0 0 1-4.2-4.2"/></svg>);
    case "lock":
      return (<svg {...props}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>);
    case "info":
      return (<svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>);
    default:
      return null;
  }
};

window.Icon = Icon;
