import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase, type Player } from '../../lib/supabase'
import LanguageSwitcher from '../LanguageSwitcher'
import './PlayerSelectionModal.css'

interface PlayerSelectionModalProps {
  onPlayerSelect: (playerName: string) => void
  currentUser?: string
}

const PlayerSelectionModal = ({
  onPlayerSelect,
  currentUser = '',
}: PlayerSelectionModalProps) => {
  const { t } = useTranslation()
  const [selectedPlayer, setSelectedPlayer] = useState(currentUser)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  // Load players from database
  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .order('name')

        if (error) throw error
        setPlayers(data || [])
      } catch (err) {
        console.error('Error loading players:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPlayers()

    // Set up real-time subscription for players
    const channel = supabase
      .channel('players-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
        },
        () => {
          loadPlayers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleConfirm = () => {
    if (selectedPlayer) {
      onPlayerSelect(selectedPlayer)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-language-switcher">
          <LanguageSwitcher />
        </div>

        <h2 className="modal-title">{t('playerModal.title')}</h2>
        <p className="modal-description">{t('playerModal.description')}</p>

        <div className="modal-player-selector">
          <select
            value={selectedPlayer}
            onChange={e => setSelectedPlayer(e.target.value)}
            className="modal-select"
            disabled={loading}
          >
            <option value="">
              {loading ? 'Loading...' : t('player.placeholder')}
            </option>
            {players.map(player => (
              <option key={player.id} value={player.name}>
                {player.name}
                {player.is_gm ? ' (GM)' : ''}
              </option>
            ))}
          </select>
        </div>

        <button
          className="modal-confirm-button"
          onClick={handleConfirm}
          disabled={!selectedPlayer}
        >
          {t('playerModal.confirmButton')}
        </button>
      </div>
    </div>
  )
}

export default PlayerSelectionModal
