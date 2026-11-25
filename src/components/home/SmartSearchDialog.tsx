import { useRef, useState, type FormEvent } from 'react'
import { errorMessage, fieldErrors } from '../../api/client'
import { useCreateProfile, useDeleteProfile, useMe, useProfiles, useWishCategories } from '../../api/queries'
import { CONTENT_TYPES, type ContentType, type ProductProfile } from '../../api/types'
import { cn } from '../../lib/cn'
import { fileToThumbnail } from '../../lib/image'
import { LIMITS, checkFileBasics, validateName } from '../../lib/limits'
import { useUi, type WishFilters } from '../../state/ui-context'
import { Icon } from '../ui/Icon'
import { Button, Field, Modal, Spinner, TextInput } from '../ui/primitives'

/** A Figma "Create Profile" slot: 60px circle + 12px label. */
function ProfileSlot({
  profile,
  selected,
  onSelect,
  onDelete,
}: {
  profile: ProductProfile
  selected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  return (
    <div className="group relative flex h-[100px] w-20 shrink-0 flex-col items-center justify-center gap-2 py-2">
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        title={`${profile.name} · shows matching styles`}
        className={cn(
          'size-[60px] overflow-hidden rounded-full ring-offset-2 ring-offset-bg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple/70',
          selected ? 'ring-2 ring-purple' : 'hover:opacity-85',
        )}
      >
        <img src={profile.imageUrl} alt="" className="size-full object-cover" />
      </button>
      <span className={cn('max-w-full truncate text-xs leading-[11px] font-medium', selected ? 'text-purple' : 'text-white')}>{profile.name}</span>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${profile.name} profile`}
        className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-container-2 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-line focus-visible:opacity-100"
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  )
}

function NewProfileForm({ onCreated, onCancel }: { onCreated: (p: ProductProfile) => void; onCancel: () => void }) {
  const { data: categories } = useWishCategories()
  const create = useCreateProfile()
  const fileInput = useRef<HTMLInputElement>(null)
  const [image, setImage] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [touched, setTouched] = useState(false)
  const server = fieldErrors(create.error)
  const errors = {
    image: imageError ?? (touched && !image ? 'Add a product photo.' : server.image),
    name: touched ? (validateName(name, LIMITS.profileNameMaxChars) ?? server.name) : undefined,
    categoryId: touched && !categoryId ? 'Pick a category.' : server.categoryId,
  }

  async function pick(file: File | undefined) {
    if (!file) return
    const basics = checkFileBasics(file)
    if (!basics.ok || basics.kind !== 'image') {
      setImageError(basics.ok ? 'Use a photo (JPG, PNG or WEBP), not a video.' : basics.error)
      return
    }
    setImageError(null)
    setReading(true)
    try {
      setImage(await fileToThumbnail(file))
      if (!name) setName(file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, LIMITS.profileNameMaxChars))
    } catch {
      setImageError("Couldn't read this image. It may be corrupted.")
    } finally {
      setReading(false)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!image || validateName(name, LIMITS.profileNameMaxChars) || !categoryId) return
    create.mutate({ name: name.trim(), categoryId, imageUrl: image }, { onSuccess: onCreated })
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-2xl bg-container/60 p-4">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            aria-label={image ? 'Change product photo' : 'Add product photo'}
            className={cn(
              'grid size-[60px] place-items-center overflow-hidden rounded-full bg-container-2 text-white transition hover:bg-line focus-visible:ring-2 focus-visible:ring-purple/70 focus-visible:outline-none',
              errors.image && 'ring-2 ring-danger/70',
            )}
          >
            {reading ? <Spinner className="size-5" /> : image ? <img src={image} alt="" className="size-full object-cover" /> : <Icon name="add" />}
          </button>
          <span className="text-[11px] text-tertiary">Photo</span>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <Field label="Profile name" error={errors.name} hint={`${name.trim().length}/${LIMITS.profileNameMaxChars}`}>
            {(id, d) => <TextInput id={id} aria-describedby={d} value={name} maxLength={LIMITS.profileNameMaxChars} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer sneakers" error={errors.name} />}
          </Field>
          <Field label="Category" error={errors.categoryId}>
            {(id, d) => (
              <select
                id={id}
                aria-describedby={d}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={cn(
                  'h-10 w-full rounded-xl border bg-container px-3 text-[13px] text-white focus:outline-none',
                  errors.categoryId ? 'border-danger/70' : 'border-transparent focus:border-purple/70',
                )}
              >
                <option value="" disabled>
                  What kind of product is it?
                </option>
                {categories
                  ?.filter((c) => c.id !== 'for-you')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
              </select>
            )}
          </Field>
        </div>
      </div>
      {errors.image && <p className="-mt-2 text-xs text-danger">{errors.image}</p>}
      {create.isError && !Object.keys(server).length && <p className="-mt-2 text-xs text-danger">{errorMessage(create.error)}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" className="h-9" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="h-9" loading={create.isPending}>
          Save profile
        </Button>
      </div>
    </form>
  )
}

/** Figma "Smart Search" pop-up: narrows the Wishes feed by product profile and content type. */
export function SmartSearchDialog({ onClose }: { onClose: () => void }) {
  const { wishFilters, setWishFilters, openDialog, toast } = useUi()
  const { data: me } = useMe()
  const { data: profiles, isPending } = useProfiles()
  const remove = useDeleteProfile()
  const [chosenProfileId, setProfileId] = useState(wishFilters.profileId)
  const [types, setTypes] = useState<ContentType[]>(wishFilters.types)
  const [adding, setAdding] = useState(false)

  // A deleted profile can't stay selected.
  const profileId = profiles?.some((p) => p.id === chosenProfileId) ? chosenProfileId : null

  const toggleType = (id: ContentType) => setTypes((list) => (list.includes(id) ? list.filter((t) => t !== id) : [...list, id]))

  function apply() {
    const profile = profiles?.find((p) => p.id === profileId)
    const patch: Partial<WishFilters> = { types, profileId: profile?.id ?? null }
    if (profile) patch.category = profile.categoryId
    else if (wishFilters.profileId) patch.category = 'for-you'
    setWishFilters(patch)
    onClose()
  }

  const nothingSelected = !profileId && types.length === 0

  return (
    <Modal open onClose={onClose} title="Smart Search">
      <section className="flex flex-col gap-3">
        <p className="text-[13px] leading-5 text-tertiary">Use a product profile to see only relevant styles</p>
        <div role="radiogroup" aria-label="Product profile" className="no-scrollbar flex items-center gap-3 overflow-x-auto">
          <div className="flex h-[100px] w-20 shrink-0 flex-col items-center justify-center gap-2 py-2">
            <button
              type="button"
              onClick={() => (me === null ? openDialog('sign-in') : setAdding((a) => !a))}
              disabled={(profiles?.length ?? 0) >= LIMITS.maxProfiles}
              aria-expanded={adding}
              title={(profiles?.length ?? 0) >= LIMITS.maxProfiles ? `Up to ${LIMITS.maxProfiles} profiles` : 'Add a product profile'}
              className="grid size-[60px] place-items-center rounded-full bg-container text-white transition-colors hover:bg-container-2 focus-visible:ring-2 focus-visible:ring-purple/70 focus-visible:outline-none disabled:opacity-40"
            >
              <Icon name={adding ? 'close' : 'add'} />
            </button>
            <span className="text-xs leading-[11px] font-medium text-white">Add Profile</span>
          </div>
          {isPending
            ? Array.from({ length: 2 }, (_, i) => <div key={i} className="size-[60px] shrink-0 rounded-full skeleton" />)
            : profiles?.map((p) => (
                <ProfileSlot
                  key={p.id}
                  profile={p}
                  selected={profileId === p.id}
                  onSelect={() => setProfileId((id) => (id === p.id ? null : p.id))}
                  onDelete={() =>
                    remove.mutate(p.id, {
                      onSuccess: () => toast({ title: `“${p.name}” profile deleted` }),
                      onError: (e) => toast({ title: "Couldn't delete profile", description: errorMessage(e), variant: 'error' }),
                    })
                  }
                />
              ))}
        </div>
        {adding && (
          <NewProfileForm
            onCancel={() => setAdding(false)}
            onCreated={(p) => {
              setAdding(false)
              setProfileId(p.id)
              toast({ title: `“${p.name}” profile created`, variant: 'success' })
            }}
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-card-title text-white">Content type</h3>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Content type">
          {CONTENT_TYPES.map((t) => {
            const on = types.includes(t.id)
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleType(t.id)}
                className={cn(
                  'flex h-9 items-center rounded-3xl px-3 text-control transition-colors focus-visible:ring-2 focus-visible:ring-purple/70 focus-visible:outline-none',
                  on ? 'bg-white text-bg-dark' : 'bg-container text-tertiary hover:text-white',
                )}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </section>

      <div className="flex items-center justify-center gap-2 py-1">
        {!nothingSelected && (
          <Button
            variant="ghost"
            onClick={() => {
              setProfileId(null)
              setTypes([])
            }}
          >
            Reset
          </Button>
        )}
        <Button onClick={apply}>{nothingSelected ? 'Show all templates' : 'Find Templates'}</Button>
      </div>
    </Modal>
  )
}
