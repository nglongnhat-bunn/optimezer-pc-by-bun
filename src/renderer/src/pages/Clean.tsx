import Button from "@/components/ui/button"
import Toggle from "@/components/ui/Toggle"
import { useState, useEffect } from "react"
import { invoke } from "@/lib/electron"
import RootDiv from "@/components/rootdiv"
import {
  Icon,
  FileX,
  Gauge,
  Trash2,
  Download,
  Image,
  Bug,
  LoaderCircle,
} from "lucide-react"
import { broom } from "@lucide/lab"
import { toast } from "react-toastify"
import log from "electron-log/renderer"
import Card from "@/components/ui/Card"

const cleanups = [
  {
    id: "temp",
    label: "Clean Temporary Files",
    path: "C:\\Windows\\Temp",
    description: "Remove system and user temporary files.",
    icon: <FileX className="w-5 h-5" />,
  },
  {
    id: "prefetch",
    label: "Clean Prefetch Files",
    path: "C:\\Windows\\Prefetch",
    description: "Delete files from the Windows Prefetch folder.",
    icon: <Gauge className="w-5 h-5" />,
  },
  {
    id: "recyclebin",
    label: "Empty Recycle Bin",
    path: "Recycle Bin",
    description: "Permanently remove files from the Recycle Bin.",
    icon: <Trash2 className="w-5 h-5" />,
  },
  {
    id: "windows-update",
    label: "Clean Windows Update Cache",
    path: "C:\\Windows\\SoftwareDistribution\\Download",
    description: "Remove Windows Update downloaded installation files.",
    icon: <Download className="w-5 h-5" />,
  },
  {
    id: "thumbnails",
    label: "Clear Thumbnail Cache",
    path: "C:\\Users\\<User>\\AppData\\Local\\Microsoft\\Windows\\Explorer",
    description: "Remove cached thumbnail images used by File Explorer.",
    icon: <Image className="w-5 h-5" />,
  },
  {
    id: "errorreports",
    label: "Clear Error Reports",
    path: "C:\\Users\\<User>\\AppData\\Local\\CrashDumps",
    description: "Remove error report and crash dump files.",
    icon: <Bug className="w-5 h-5" />,
  },
]

function Clean() {
  const [selected, setSelected] = useState<string[]>([])
  const [loadingQueue, setLoadingQueue] = useState<string[]>([])
  const [lastClean, setLastClean] = useState(
    localStorage.getItem("last-clean") || "Not cleaned yet.",
  )
  const [isCleaning, setIsCleaning] = useState(false)
  const [cleanupResults, setCleanupResults] = useState({})
  const [currentSizes, setCurrentSizes] = useState<Record<string, number>>({})
  const [loadingSizes, setLoadingSizes] = useState(false)

  const toggleCleanup = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const formatBytes = (bytes) => {
    if (bytes === 0 || !bytes) return "0 B"
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
  }

  async function fetchSizes(silent = false) {
    if (!silent) setLoadingSizes(true)

    try {
      const sizes = await invoke({ channel: "cleaner:get-sizes" })
      setCurrentSizes((prev) => ({ ...prev, ...(sizes || {}) }))
    } catch (err) {
      log.error(`Failed to fetch cleaner sizes: ${err}`)
    } finally {
      if (!silent) setLoadingSizes(false)
    }
  }

  useEffect(() => {
    fetchSizes()
  }, [])

  const totalSize = Object.values(currentSizes).reduce((sum, size) => sum + (size || 0), 0)
  const totalFreed = Object.values(cleanupResults as Record<string, number>).reduce(
    (sum: number, size) => sum + (size || 0),
    0,
  )

  async function runSelectedCleanups() {
    toast.dismiss()
    setIsCleaning(true)
    setLoadingQueue([])
    setCleanupResults({})
    let anySuccess = false
    let newResults = {}

    for (const cleanup of cleanups) {
      if (!selected.includes(cleanup.id)) continue
      setLoadingQueue((q) => [...q, cleanup.id])
      const toastId = toast.loading(`Running ${cleanup.label}...`)
      try {
        const freedSpace = Number(
          await invoke({ channel: "cleaner:run-cleanup", payload: cleanup.id }),
        )
        newResults[cleanup.id] = freedSpace || 0

        toast.update(toastId, {
          render: `${cleanup.label} completed! ${formatBytes(freedSpace)} cleared.`,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        })
        anySuccess = true
      } catch (err: any) {
        toast.update(toastId, {
          render: `Failed: ${err.message || err}`,
          type: "error",
          isLoading: false,
          autoClose: 4000,
        })
        log.error(`Failed to run ${cleanup.id} cleanup: ${err.message || err}`)
      }
    }

    if (anySuccess) {
      const now = new Date().toLocaleString()
      setLastClean(now)
      localStorage.setItem("last-clean", now)
      setCleanupResults(newResults)
      fetchSizes(true)
    }

    setLoadingQueue([])
    setIsCleaning(false)
  }

  return (
    <RootDiv>
      <div className="flex flex-col gap-6">
        <Card className="flex items-center gap-4 p-4">
          <div className="flex items-center justify-center p-3 rounded-xl bg-teal-500/10">
            <Icon iconNode={broom} className="text-teal-500" size={28} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-sparkle-text mb-1">System Cleaner</h2>
            <p className="text-sm text-sparkle-text-secondary">
              Last cleaned: <span className="font-medium">{lastClean}</span>
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
              <p className="text-sm text-sparkle-text-secondary">
                {loadingSizes ? (
                  "Calculating total size..."
                ) : (
                  <>
                    Total size:{" "}
                    <span className="font-medium text-teal-500">{formatBytes(totalSize)}</span>
                  </>
                )}
              </p>
              {totalFreed > 0 && (
                <p className="text-sm text-green-500">
                  Total freed: <span className="font-medium">{formatBytes(totalFreed)}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center">
            {selected.length > 0 ? (
              <Button onClick={() => setSelected([])} variant="secondary" className="mr-2">
                Unselect All
              </Button>
            ) : (
              <Button
                onClick={() => setSelected(cleanups.map((c) => c.id))}
                variant="secondary"
                className="mr-2"
              >
                Select All
              </Button>
            )}
            <Button
              onClick={runSelectedCleanups}
              disabled={isCleaning || selected.length === 0}
              size="md"
              variant="primary"
              className="min-w-45 flex items-center justify-center gap-2 text-base font-semibold"
            >
              {isCleaning ? (
                <>
                  <LoaderCircle className="animate-spin" size={18} />
                  <span>Cleaning...</span>
                </>
              ) : (
                <>
                  <Icon iconNode={broom} size={18} />
                  <span>Clean Selected</span>
                </>
              )}
            </Button>
          </div>
        </Card>
        <Card className="flex flex-col divide-y divide-sparkle-border p-0 mb-10">
          {cleanups.map(({ id, label, description, path, icon }, idx) => {
            const isSelected = selected.includes(id)
            const currentSize = currentSizes[id]
            const freedSpace = cleanupResults[id]
            return (
              <div
                key={id}
                className={`relative flex items-center justify-between px-6 py-5 ${idx === 0 ? "rounded-t-xl" : ""} ${idx === cleanups.length - 1 ? "rounded-b-xl" : ""} group hover:bg-sparkle-card/50 transition-colors`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sparkle-border/50 text-sparkle-text-secondary">
                    {icon}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-semibold text-sparkle-text truncate">
                        {label}
                      </span>
                      {freedSpace ? (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/20 text-green-500">
                          {formatBytes(freedSpace)} freed
                        </span>
                      ) : null}
                    </div>
                    <span className="text-sm text-sparkle-text-secondary mt-1">{description}</span>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-sparkle-text-muted flex items-center gap-1">
                        <span className="font-medium">Size:</span>
                        {loadingSizes ? (
                          <span className="text-sparkle-text-secondary">Calculating...</span>
                        ) : currentSize !== undefined ? (
                          <span className="text-teal-500 font-medium">
                            {formatBytes(currentSize)}
                          </span>
                        ) : (
                          <span className="text-sparkle-text-secondary">Unknown</span>
                        )}
                      </span>
                      {path && path !== "Recycle Bin" && (
                        <span className="text-xs text-sparkle-text-muted truncate max-w-xs">
                          {path}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="ml-4 flex items-center">
                  <Toggle
                    checked={isSelected}
                    onChange={() => toggleCleanup(id)}
                    disabled={isCleaning}
                  />
                </div>
                {loadingQueue.includes(id) && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 rounded-xl">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sparkle-border border border-sparkle-border-secondary">
                      <LoaderCircle className="animate-spin text-teal-500" size={18} />
                      <span className="text-sm font-medium text-teal-600">Cleaning...</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </Card>
      </div>
    </RootDiv>
  )
}

export default Clean
