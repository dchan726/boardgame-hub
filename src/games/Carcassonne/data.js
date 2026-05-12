// ... （保留之前所有的代碼結構，只更新 renderTileSVG 函數）

  const renderTileSVG = (type, rotation, isGhost = false) => {
    const tileDef = CARCASSONNE_TILES[type];
    const rotDeg = rotation * 90;

    // ★ 修正：定義手繪風的顏色與紋理
    const cGrass = '#a7c97e', cGrassDark = '#8aab69';
    const cRoadEdge = '#b5ad9e', cRoadCenter = '#ebe6de';
    const cCityBase = '#e2cda3', cCityWall = '#8b6045';

    // ... （ renderCityGroup 和 renderRoadGroup 函數保持不變）

    return (
      <svg viewBox="0 0 100 100" className={`w-full h-full ${isGhost ? 'opacity-80 drop-shadow-lg' : ''}`} style={{ transform: `rotate(${rotDeg}deg)`, transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
        <defs>
          {/* ★ 新增：定義手繪紋理圖案 */}
          <pattern id="grass-sketch" patternUnits="userSpaceOnUse" width="25" height="25">
            <rect width="25" height="25" fill={cGrass} />
            <circle cx="5" cy="5" r="1.5" fill={cGrassDark} opacity="0.6"/>
            {/* 加入不規則的手繪線條 */}
            <path d="M 12 20 Q 14 16 16 20" stroke={cGrassDark} fill="none" opacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M 18 10 Q 20 6 22 10" stroke={cGrassDark} fill="none" opacity="0.3" strokeWidth="1" strokeLinecap="round"/>
            <path d="M 3 15 L 7 19" stroke={cGrassDark} fill="none" opacity="0.4" strokeWidth="1" strokeLinecap="round"/>
          </pattern>
        </defs>
        
        {/* ★ 修正：使用手繪紋理填充背景 */}
        <rect width="100" height="100" fill="url(#grass-sketch)" />
        
        {/* ★ 修正：將原本的邊框改為更粗且帶有墨水感的線條 */}
        <rect width="100" height="100" fill="none" stroke="#6d864b" strokeWidth="1.5" strokeLinecap="round" rx="2"/> 
        
        {/* ★ 修正：將所有的路徑增加手繪筆觸（例如不規則的邊緣、墨水暈染感，此處通過 SVG 屬性模擬） */}
        {tileDef.conn.R?.map((group, idx) => (
            <g key={`road-${idx}`} style={{ filter: 'url(#pencil-texture)' }}>
                {renderRoadGroup(group)}
            </g>
        ))}
        {tileDef.id.includes('cross') && <rect x={40} y={40} width={20} height={20} fill={cRoadEdge} stroke="#8c8577" strokeWidth="2" rx="1"/>}
        {tileDef.id.includes('cross') && <rect x={43} y={43} width={14} height={14} fill={cRoadCenter} rx="0.5"/>}
        
        {tileDef.conn.C?.map((group, idx) => (
            <g key={`city-${idx}`} style={{ filter: 'url(#ink-bleed)' }}>
                {renderCityGroup(group, idx === 0 && tileDef.shields > 0)}
            </g>
        ))}
        
        {tileDef.special === 'cloister' && (
          <g transform="translate(50, 50)" style={{ filter: 'url(#pencil-texture)' }}>
            {/* ★ 修正：將修道院的設計改為更有手繪素描感的風格 */}
            <circle cx="0" cy="0" r="22" fill="#c4ad8d" stroke="#a38f72" strokeWidth="2"/>
            <circle cx="0" cy="0" r="18" fill="none" stroke="#a38f72" strokeWidth="1" strokeDasharray="3 3"/>
            <rect x="-14" y="-12" width="28" height="26" fill="#cfcdca" stroke="#5c5c5c" strokeWidth="2.5" rx="2" />
            <rect x="-6" y="2" width="12" height="12" fill="#8c8b88" stroke="#5c5c5c" strokeWidth="1.5"/> 
            <path d="M -16 0 L 0 -16 L 16 0 Z" fill="#b04331" stroke="#5c5c5c" strokeWidth="2.5" strokeLinejoin="round" />
            {/* ...其餘細節... */}
          </g>
        )}
        
        {tileDef.hasGarden && (
          <g transform="translate(25, 25)" style={{ filter: 'url(#pencil-texture)' }}>
            {/* ★ 修正：將花園的計分點改為更有手繪感的不規則圓形與顏色暈染 */}
            <circle cx="0" cy="0" r="14" fill="#15803d" stroke="#0f5a2a" strokeWidth="2"/>
            <circle cx="0" cy="0" r="11" fill="#22c55e" stroke="none"/>
            <circle cx="-5" cy="-5" r="2.5" fill="#fbbf24" stroke="#d9a41b" strokeWidth="1"/>
            <circle cx="5" cy="3" r="2.5" fill="#3b82f6" stroke="#2a62c9" strokeWidth="1"/>
            <circle cx="-3" cy="6" r="2" fill="#ef4444" stroke="#c93838" strokeWidth="1"/>
            <circle cx="4" cy="-4" r="1.5" fill="#a855f7" stroke="#8a44c9" strokeWidth="1"/>
          </g>
        )}

        {/* ★ 新增：定義 SVG 濾鏡來模擬墨水暈染與鉛筆質感 */}
        <defs>
            <filter id="pencil-texture">
                <feTurbulence type="fractalNoise" baseFrequency="2" numOctaves="3" result="noise"/>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G"/>
            </filter>
            <filter id="ink-bleed">
                <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blur"/>
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo"/>
                <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
            </filter>
        </defs>
      </svg>
    );
  };

// ... （保留其餘代碼）
