interface MonthlyRankingTimelineProps {
  totalGames: number;
  currentGameIndex: number;  // 0 = show all games
  isPlaying: boolean;
  onSeek: (index: number) => void;
  onPause: () => void;
}

export function MonthlyRankingTimeline({
  totalGames,
  currentGameIndex,
  isPlaying,
  onSeek,
  onPause,
}: MonthlyRankingTimelineProps) {
  // When currentGameIndex is 0 (show all), slider should be at the end
  const sliderValue = currentGameIndex === 0 ? totalGames : currentGameIndex;
  const progress = totalGames > 1 ? ((sliderValue - 1) / (totalGames - 1)) * 100 : 100;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPlaying) {
      onPause();
    }
    const value = Number(e.target.value);
    // If dragged to max, set to 0 (show all)
    if (value >= totalGames) {
      onSeek(0);
    } else {
      onSeek(Math.max(1, value));
    }
  };

  return (
    <div className="monthly-timeline">
      <input
        type="range"
        className="monthly-timeline-slider"
        min={1}
        max={totalGames}
        value={sliderValue}
        onChange={handleChange}
        style={{
          background: `linear-gradient(to right, var(--accent-primary) 0%, var(--accent-primary) ${progress}%, var(--bg-tertiary) ${progress}%, var(--bg-tertiary) 100%)`,
        }}
      />
      <div className="monthly-timeline-labels">
        <span className="monthly-timeline-current">
          {currentGameIndex === 0
            ? `Toutes les ${totalGames} parties`
            : `Partie ${currentGameIndex} / ${totalGames}`}
        </span>
      </div>
    </div>
  );
}
