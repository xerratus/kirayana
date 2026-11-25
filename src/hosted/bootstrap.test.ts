import {describe,it,expect,vi} from 'vitest'
import {initialOrganizer} from '../organizer/model'
import {loadOrCreateOrganizer} from './bootstrap'
const repository=()=>({load:vi.fn(async()=>null as ReturnType<typeof initialOrganizer>|null),save:vi.fn(async()=>{}),close:vi.fn()})
describe('new account canvas',()=>{
  it('saves a fresh canvas with the user centered without reading local browser data',async()=>{
    const repo=repository(),state=await loadOrCreateOrganizer(repo,'John McGuinness')
    expect(state.nodes.find(node=>node.id===state.rootId)).toMatchObject({kind:'user',name:'John McGuinness',position:{x:0,y:0}})
    expect(state.nodes.filter(node=>node.kind!=='user').map(node=>node.kind)).toEqual(['skills'])
    expect(repo.save).toHaveBeenCalledExactlyOnceWith(state)
  })
  it('opens an existing canvas without changing it',async()=>{
    const repo=repository(),saved=initialOrganizer();repo.load.mockResolvedValue(saved)
    expect(await loadOrCreateOrganizer(repo,'Another name')).toBe(saved);expect(repo.save).not.toHaveBeenCalled()
  })
  it('does not create a canvas when loading fails',async()=>{
    const repo=repository();repo.load.mockRejectedValue(new Error('Offline'))
    await expect(loadOrCreateOrganizer(repo,'John')).rejects.toThrow('Offline');expect(repo.save).not.toHaveBeenCalled()
  })
  it('opens the winning canvas when two tabs create at the same time',async()=>{
    const repo=repository(),winner=initialOrganizer();repo.load.mockResolvedValueOnce(null).mockResolvedValueOnce(winner);repo.save.mockRejectedValue({code:'PT409'})
    expect(await loadOrCreateOrganizer(repo,'John')).toBe(winner);expect(repo.save).toHaveBeenCalledTimes(1)
  })
  it('keeps creation failures visible for retry',async()=>{
    const repo=repository();repo.save.mockRejectedValue(new Error('Offline'))
    await expect(loadOrCreateOrganizer(repo,'John')).rejects.toThrow('Offline')
  })
})
