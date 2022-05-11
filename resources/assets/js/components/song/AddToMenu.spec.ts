import { clone } from 'lodash'
import { expect, it } from 'vitest'
import factory from '@/__tests__/factory'
import { favoriteStore, playlistStore, queueStore } from '@/stores'
import ComponentTestCase from '@/__tests__/ComponentTestCase'
import Btn from '@/components/ui/Btn.vue'
import AddToMenu from './AddToMenu.vue'
import { arrayify } from '@/utils'
import { fireEvent } from '@testing-library/vue'

let songs: Song[]

const config: AddToMenuConfig = {
  queue: true,
  favorites: true,
  playlists: true,
  newPlaylist: true
}

new class extends ComponentTestCase {
  private renderComponent (customConfig: Partial<AddToMenuConfig> = {}) {
    songs = factory<Song>('song', 5)

    return this.render(AddToMenu, {
      props: {
        songs,
        config: Object.assign(clone(config), customConfig),
        showing: true
      },
      global: {
        stubs: {
          Btn
        }
      }
    })
  }

  protected test () {
    it('renders', () => {
      playlistStore.state.playlists = [
        factory<Playlist>('playlist', { name: 'Foo' }),
        factory<Playlist>('playlist', { name: 'Bar' }),
        factory<Playlist>('playlist', { name: 'Baz' })
      ]

      const { html } = this.renderComponent()
      expect(html()).toMatchSnapshot()
    })

    it.each<[keyof AddToMenuConfig, string | string[]]>([
      ['queue', ['queue-after-current', 'queue-bottom', 'queue-top', 'queue']],
      ['favorites', 'add-to-favorites'],
      ['playlists', 'add-to-playlist'],
      ['newPlaylist', 'new-playlist']
    ])('renders disabling %s config', (configKey: keyof AddToMenuConfig, testIds: string | string[]) => {
      const { queryByTestId } = this.renderComponent({ [configKey]: false })
      arrayify(testIds).forEach(async (id) => expect(await queryByTestId(id)).toBeNull())
    })

    it.each<[string, string, MethodOf<typeof queueStore>]>([
      ['after current', 'queue-after-current', 'queueAfterCurrent'],
      ['to top', 'queue-top', 'queueToTop'],
      ['to bottom', 'queue-bottom', 'queue']
    ])('queues songs %s', async (_: string, testId: string, queueMethod: MethodOf<typeof queueStore>) => {
      queueStore.state.songs = factory<Song>('song', 5)
      queueStore.state.current = queueStore.state.songs[1]
      const mock = this.mock(queueStore, queueMethod)
      const { getByTestId } = this.renderComponent()

      await fireEvent.click(getByTestId(testId))

      expect(mock).toHaveBeenCalledWith(songs)
    })

    it('adds songs to Favorites', async () => {
      const mock = this.mock(favoriteStore, 'like')
      const { getByTestId } = this.renderComponent()

      await fireEvent.click(getByTestId('add-to-favorites'))

      expect(mock).toHaveBeenCalledWith(songs)
    })

    it('adds songs to existing playlist', async () => {
      const mock = this.mock(playlistStore, 'addSongs')
      playlistStore.state.playlists = factory<Playlist>('playlist', 3)
      const { getAllByTestId } = this.renderComponent()

      await fireEvent.click(getAllByTestId('add-to-playlist')[1])

      expect(mock).toHaveBeenCalledWith(playlistStore.state.playlists[1], songs)
    })
  }
}