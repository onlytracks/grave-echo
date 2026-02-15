export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutRegions {
  gameGrid: Region;
  playerStats: Region;
  targetInfo: Region;
  messageLog: Region;
  equipment: Region;
}

export function calculateLayout(
  screenWidth: number,
  screenHeight: number,
): LayoutRegions {
  const minRightCol = 20;
  const minBottomRow = 6;

  const rightColWidth = Math.max(minRightCol, Math.floor(screenWidth * 0.3));
  const leftColWidth = screenWidth - rightColWidth;

  const bottomRowHeight = Math.max(
    minBottomRow,
    Math.floor(screenHeight * 0.3),
  );
  const topRowHeight = screenHeight - bottomRowHeight;

  const playerStatsHeight = Math.floor(topRowHeight / 2);
  const targetInfoHeight = topRowHeight - playerStatsHeight;

  return {
    gameGrid: {
      x: 0,
      y: 0,
      width: leftColWidth,
      height: topRowHeight,
    },
    playerStats: {
      x: leftColWidth,
      y: 0,
      width: rightColWidth,
      height: playerStatsHeight,
    },
    targetInfo: {
      x: leftColWidth,
      y: playerStatsHeight,
      width: rightColWidth,
      height: targetInfoHeight,
    },
    messageLog: {
      x: 0,
      y: topRowHeight,
      width: leftColWidth,
      height: bottomRowHeight,
    },
    equipment: {
      x: leftColWidth,
      y: topRowHeight,
      width: rightColWidth,
      height: bottomRowHeight,
    },
  };
}
