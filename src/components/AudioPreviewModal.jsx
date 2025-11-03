import { useState, useEffect, useRef } from 'react';
import './AudioPreviewModal.css';

const AudioPreviewModal = ({ 
  isOpen, 
  onClose, 
  audioBlob, 
  provider,
  voiceName,
  onAccept, 
  onRegenerate,
  isRegenerating 
}) => {
  const [audioURL, setAudioURL] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioURL(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [audioBlob]);

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [isOpen]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleAccept = () => {
    onAccept();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content audio-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Preview do Áudio</h2>
          <button className="modal-close-button" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="audio-info">
            <div className="info-item">
              <span className="info-label">Gerado por:</span>
              <span className="info-value">{provider}</span>
            </div>
            {voiceName && (
              <div className="info-item">
                <span className="info-label">Voz:</span>
                <span className="info-value">{voiceName}</span>
              </div>
            )}
          </div>

          <div className="audio-player-container">
            <audio
              ref={audioRef}
              src={audioURL}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
            />

            <div className="audio-player">
              <button 
                className="play-pause-button"
                onClick={handlePlayPause}
                disabled={!audioURL}
              >
                {isPlaying ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5,3 19,12 5,21"></polygon>
                  </svg>
                )}
              </button>

              <div className="time-display">
                {formatTime(currentTime)}
              </div>

              <div className="progress-bar" onClick={handleSeek}>
                <div 
                  className="progress-fill"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>

              <div className="time-display">
                {formatTime(duration)}
              </div>
            </div>
          </div>

          <div className="audio-actions-info">
            <p>Você pode ouvir o áudio gerado antes de salvar. Se não gostar, pode gerar novamente com outras configurações.</p>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="btn-secondary"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <>
                <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
                Gerando...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23,4 23,10 17,10"></polyline>
                  <polyline points="1,20 1,14 7,14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                Gerar Novamente
              </>
            )}
          </button>
          <button 
            className="btn-primary"
            onClick={handleAccept}
            disabled={isRegenerating}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20,6 9,17 4,12"></polyline>
            </svg>
            Salvar Áudio
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioPreviewModal;
