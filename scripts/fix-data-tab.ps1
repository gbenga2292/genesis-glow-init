$file = 'c:\Users\USER\Desktop\assign\first-light-engine\src\components\settings\CompanySettings.tsx'
$content = [System.IO.File]::ReadAllText($file)

$startMarker = '      {/* Data Management Tab */}'
$endMarker = '      {/* App Updates Tab */}'

$startIdx = $content.IndexOf($startMarker)
$endIdx = $content.IndexOf($endMarker)

$before = $content.Substring(0, $startIdx)
$after = $content.Substring($endIdx)

$newSection = @'
      {/* Data Management Tab */}
      {activeSettingsTab === "data" && (
        <div className="space-y-6 mt-4">

          {/* Top action cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Backup card */}
            <Card className="border-0 shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Download className="h-5 w-5 text-primary" />
                  Backup Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Download a JSON snapshot of all selected data sections. Store it safely — you can restore from it later.
                </p>
                <Button className="w-full gap-2" variant="outline" disabled={isLoading} onClick={() => setIsBackupDialogOpen(true)}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Create Backup
                </Button>
              </CardContent>
            </Card>

            {/* Restore card */}
            {hasPermission('restore_data') && (
              <Card className="border-0 shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UploadCloud className="h-5 w-5 text-amber-500" />
                    Restore Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Upload a previously created JSON backup file to restore your data into the database.
                  </p>
                  <Button className="w-full gap-2" variant="outline" disabled={isLoading} onClick={() => setIsRestoreOpen(true)}>
                    <UploadCloud className="h-4 w-4" />
                    Restore from File
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Reset card */}
            {hasPermission('reset_data') && (
              <Card className="border border-destructive/30 bg-destructive/5 shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-destructive">
                    <Trash2 className="h-5 w-5" />
                    Reset All Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Permanently wipe all inventory data from the database. <strong>This cannot be undone.</strong>
                  </p>
                  <AlertDialog open={isResetOpen} onOpenChange={setIsResetOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full gap-2" disabled={isLoading}>
                        <Trash2 className="h-4 w-4" />
                        Reset All Data
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset All Data</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all assets, waybills, returns, sites, employees, vehicles, and settings. This action <strong>cannot be undone</strong>. Make sure you have a backup first.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Yes, Reset Everything
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Activity Log */}
          <Card className="border-0 shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ActivityIcon className="h-5 w-5" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">View and export a record of all user actions in the system.</p>
              <Button variant="outline" className="gap-2" onClick={() => setShowActivityLog(true)}>
                <ActivityIcon className="h-4 w-4" />
                View Activity Log
              </Button>
            </CardContent>
          </Card>

          {/* Automatic Backup Scheduler Panel (Electron only) */}
          {window.backupScheduler && (
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Automatic Backup Scheduler
                </CardTitle>
                <p className="text-sm text-muted-foreground">Configure automatic daily backups to NAS and local storage</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg bg-card">
                    <div className="text-sm font-medium text-muted-foreground">Status</div>
                    <div className="text-2xl font-bold mt-1">
                      {autoBackupEnabled ? <span className="text-green-600">Enabled</span> : <span className="text-gray-500">Disabled</span>}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-card">
                    <div className="text-sm font-medium text-muted-foreground">Next Backup</div>
                    <div className="text-lg font-semibold mt-1">
                      {backupSchedulerStatus?.nextRun
                        ? (() => { try { const d = new Date(backupSchedulerStatus.nextRun); return !isNaN(d.getTime()) ? d.toLocaleString() : 'Today at 5:00 PM'; } catch { return 'Today at 5:00 PM'; } })()
                        : 'Today at 5:00 PM'}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-card">
                    <div className="text-sm font-medium text-muted-foreground">NAS Status</div>
                    <div className="text-lg font-semibold mt-1 flex items-center gap-2">
                      {nasAccessible === null ? <span className="text-gray-500">Checking...</span>
                        : nasAccessible
                          ? <><span className="h-2 w-2 rounded-full bg-green-500" /><span className="text-green-600">Accessible</span></>
                          : <><span className="h-2 w-2 rounded-full bg-red-500" /><span className="text-red-600">Not Accessible</span></>}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-base font-semibold">Enable Automatic Backups</Label>
                      <p className="text-sm text-muted-foreground">Backups run daily at 5:00 PM (17:00)</p>
                    </div>
                    {hasPermission('restore_data') && (
                      <Switch checked={autoBackupEnabled} onCheckedChange={handleAutoBackupToggle} />
                    )}
                  </div>

                  <div className="p-4 border rounded-lg space-y-3">
                    <Label className="text-base font-semibold">Retention Period</Label>
                    <p className="text-sm text-muted-foreground">Number of days to keep backups</p>
                    <div className="flex items-center gap-4">
                      <Input type="number" min="1" max="365" value={backupRetentionDays}
                        onChange={(e) => { const d = parseInt(e.target.value); if (d > 0 && d <= 365) setBackupRetentionDays(d); }}
                        className="w-24" />
                      <span className="text-sm text-muted-foreground">days</span>
                      <Button size="sm" onClick={() => handleRetentionChange(backupRetentionDays)} disabled={isLoading || !hasPermission('restore_data')}>Apply</Button>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg space-y-3">
                    <Label className="text-base font-semibold">NAS Backup Path</Label>
                    <p className="text-sm text-muted-foreground">{backupSchedulerStatus?.nasBackupPath || '\\\\MYCLOUDEX2ULTRA\\Operations\\Inventory System\\Backups'}</p>
                    <Button variant="outline" size="sm" onClick={handleCheckNAS} disabled={isLoading}>Check NAS Accessibility</Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={async () => { if (window.backupScheduler) { const b = await window.backupScheduler.listBackups(); setBackupsList(b); toast({ title: "Backups List Refreshed" }); } }} className="gap-2">
                    <ActivityIcon className="h-4 w-4" />
                    Refresh List
                  </Button>
                </div>

                {backupsList && (
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-semibold">Recent NAS Backups</h3>
                    {nasAccessible && (
                      <div className="space-y-4">
                        <div className="border rounded-md">
                          <button onClick={() => setIsNasJsonOpen(!isNasJsonOpen)} className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2">
                              {isNasJsonOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <h4 className="font-semibold text-sm">NAS JSON Backups</h4>
                            </div>
                            <span className="text-xs text-muted-foreground mr-2">{backupsList.nas?.json?.length || 0} files</span>
                          </button>
                          {isNasJsonOpen && (
                            <div className="px-3 pb-3">
                              {backupsList.nas?.json?.length > 0 ? (
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                  {backupsList.nas.json.map((backup: any) => (
                                    <div key={backup.path} className="flex items-center justify-between p-2 rounded-lg border bg-green-50/50 dark:bg-green-950/20">
                                      <div className="flex-1">
                                        <div className="font-medium text-sm flex items-center gap-2"><FileText className="h-3 w-3 text-green-600" />{backup.name}</div>
                                        <div className="text-xs text-muted-foreground ml-5">{new Date(backup.created).toLocaleString()} • {(backup.size / 1024 / 1024).toFixed(2)} MB • {backup.age} days old</div>
                                      </div>
                                      {hasPermission('restore_data') && (
                                        <Button variant="ghost" size="sm" className="ml-2 h-8 w-8 p-0" onClick={() => handleRestoreFromNAS(backup.path)} disabled={isLoading} title="Restore from this backup">
                                          <UploadCloud className="h-4 w-4 text-green-700 dark:text-green-400" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : <p className="text-sm text-muted-foreground py-2 italic ml-5">No NAS JSON backups found</p>}
                            </div>
                          )}
                        </div>

                        <div className="border rounded-md">
                          <button onClick={() => setIsNasDbOpen(!isNasDbOpen)} className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2">
                              {isNasDbOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <h4 className="font-semibold text-sm">NAS Database Backups</h4>
                            </div>
                            <span className="text-xs text-muted-foreground mr-2">{backupsList.nas?.database?.length || 0} files</span>
                          </button>
                          {isNasDbOpen && (
                            <div className="px-3 pb-3">
                              {backupsList.nas?.database?.length > 0 ? (
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                  {backupsList.nas.database.map((backup: any) => (
                                    <div key={backup.path} className="flex items-center justify-between p-2 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20">
                                      <div className="flex-1">
                                        <div className="font-medium text-sm flex items-center gap-2"><Database className="h-3 w-3 text-blue-600" />{backup.name}</div>
                                        <div className="text-xs text-muted-foreground ml-5">{new Date(backup.created).toLocaleString()} • {(backup.size / 1024 / 1024).toFixed(2)} MB • {backup.age} days old</div>
                                      </div>
                                      {hasPermission('restore_data') && (
                                        <Button variant="ghost" size="sm" className="ml-2 h-8 w-8 p-0" onClick={() => handleRestoreFromNAS(backup.path)} disabled={isLoading} title="Restore from this backup">
                                          <UploadCloud className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : <p className="text-sm text-muted-foreground py-2 italic ml-5">No NAS database backups found</p>}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Backup Dialog */}
      <Dialog open={isBackupDialogOpen} onOpenChange={setIsBackupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Download className="h-5 w-5 text-primary" />Create Backup</DialogTitle>
            <DialogDescription>Select which data sections to include in the backup file.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-72 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Data Sections</Label>
              <button className="text-xs text-primary underline" onClick={() => setSelectedBackupItems(new Set(backupOptions.map(o => o.id)))}>Select All</button>
            </div>
            {backupOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50">
                <Checkbox
                  id={`bk-${option.id}`}
                  checked={selectedBackupItems.has(option.id)}
                  onCheckedChange={(checked) => {
                    const s = new Set(selectedBackupItems);
                    checked ? s.add(option.id) : s.delete(option.id);
                    setSelectedBackupItems(s);
                  }}
                />
                <Label htmlFor={`bk-${option.id}`} className="cursor-pointer text-sm">{option.label}</Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBackupDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBackupConfirm} disabled={isLoading || selectedBackupItems.size === 0} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={isRestoreOpen} onOpenChange={(open) => {
        setIsRestoreOpen(open);
        if (!open) {
          setLoadedBackupData(null); setAvailableSections([]); setRestoreSelectedSections(new Set());
          setShowRestoreSectionSelector(false); setIsRestoreComplete(false);
          setRestoreProgress({ phase: 'idle', total: 0, done: 0, message: '', errors: [] });
          setRestoreFile(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          {!showRestoreSectionSelector && !isRestoringLive && !isRestoreComplete && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><UploadCloud className="h-5 w-5 text-amber-500" />Restore Data from Backup</DialogTitle>
                <DialogDescription>Select a JSON backup file to restore your data.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <label htmlFor="restore-file-input"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                  <UploadCloud className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">{restoreFile ? restoreFile.name : 'Click to browse or drag & drop'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports .json backup files</p>
                  <input id="restore-file-input" type="file" accept=".json,.db,.sqlite" onChange={handleFileSelect} className="hidden" />
                </label>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsRestoreOpen(false)}>Cancel</Button>
              </DialogFooter>
            </>
          )}

          {showRestoreSectionSelector && !isRestoringLive && !isRestoreComplete && (
            <>
              <DialogHeader>
                <DialogTitle>Select Sections to Restore</DialogTitle>
                <DialogDescription>Choose which data sections to restore from the backup ({availableSections.length} available).</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 max-h-72 overflow-y-auto py-2">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Available Sections</Label>
                  <button className="text-xs text-primary underline" onClick={() => setRestoreSelectedSections(new Set(availableSections))}>Select All</button>
                </div>
                {availableSections.map((section) => (
                  <div key={section} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent">
                    <Checkbox
                      id={`rs-${section}`}
                      checked={restoreSelectedSections.has(section)}
                      onCheckedChange={(checked) => {
                        const s = new Set(restoreSelectedSections);
                        checked ? s.add(section) : s.delete(section);
                        setRestoreSelectedSections(s);
                      }}
                      disabled={isLoading}
                    />
                    <Label htmlFor={`rs-${section}`} className="flex-1 cursor-pointer">
                      {section.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Label>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowRestoreSectionSelector(false); setRestoreFile(null); setLoadedBackupData(null); }} disabled={isLoading}>Back</Button>
                <Button onClick={handleRestore} disabled={restoreSelectedSections.size === 0 || isLoading} className="gap-2">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  Start Restore
                </Button>
              </DialogFooter>
            </>
          )}

          {(isRestoringLive || isRestoreComplete) && (
            <>
              <DialogHeader>
                <DialogTitle>{isRestoreComplete ? '✓ Restore Completed' : 'Restoring Data...'}</DialogTitle>
                <DialogDescription>{restoreProgress.phase}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{restoreProgress.message}</span>
                    <span className="text-muted-foreground">{restoreProgress.done}/{restoreProgress.total}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all duration-300 ${isRestoreComplete ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${restoreProgress.total > 0 ? (restoreProgress.done / restoreProgress.total) * 100 : isRestoreComplete ? 100 : 30}%` }} />
                  </div>
                </div>
                {restoreProgress.errors?.length > 0 && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 max-h-40 overflow-y-auto">
                    <h3 className="font-semibold text-sm mb-2 text-destructive">Errors ({restoreProgress.errors.length})</h3>
                    <ul className="space-y-1">
                      {restoreProgress.errors.map((err: any, idx: number) => (
                        <li key={idx} className="text-xs text-destructive/80"><span className="font-medium">{err.section}:</span> {err.message || err.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {isRestoreComplete && (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <p className="text-sm text-green-800 dark:text-green-300">Restore completed successfully! The page will reload shortly.</p>
                  </div>
                )}
              </div>
              {isRestoreComplete && (
                <DialogFooter>
                  <Button onClick={() => {
                    setIsRestoreOpen(false); setLoadedBackupData(null); setAvailableSections([]);
                    setRestoreSelectedSections(new Set()); setShowRestoreSectionSelector(false);
                    setIsRestoreComplete(false); setRestoreProgress({ phase: 'idle', total: 0, done: 0, message: '', errors: [] });
                    setRestoreFile(null);
                  }}>Close</Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Activity Log Dialog */}
      <Dialog open={showActivityLog} onOpenChange={setShowActivityLog}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Activity Log</DialogTitle>
            <DialogDescription>View all system activities and user actions. {activities.length} total activities.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <Button variant="outline" onClick={handleBackupActivities} size="sm">
                <Download className="h-3 w-3 mr-1" />Export TXT
              </Button>
              <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={!isAdmin}><Trash2 className="h-3 w-3 mr-1" />Clear Log</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Activity Log</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete all activity logs. This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearActivities} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Clear Log</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            {activities.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground">No activities recorded yet.</div>
            ) : (
              <div className="overflow-auto max-h-[calc(80vh-200px)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...activities].reverse().map((activity, idx) => (
                      <TableRow key={activity.id || idx}>
                        <TableCell className="font-mono text-xs">{new Date(activity.timestamp).toLocaleString()}</TableCell>
                        <TableCell>{activity.userName}</TableCell>
                        <TableCell className="capitalize">{activity.action}</TableCell>
                        <TableCell className="capitalize">{activity.entity}</TableCell>
                        <TableCell>{activity.entityId || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate">{activity.details}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

'@

$newContent = $before + $newSection + $after
[System.IO.File]::WriteAllText($file, $newContent, [System.Text.Encoding]::UTF8)
Write-Host "Done. New file length: $($newContent.Length)"
