// 運転日誌アプリケーション - HTML5 Dialog対応版
class DrivingLogApp {
    constructor() {
        this.records = [];
        this.currentId = 1;
        this.version = '0.955';
        this.lastUpdate = new Date().toISOString();
        this.confirmCallback = null;
        this.backupInterval = null;
        this.init();
    }

    init() {
        this.loadData(); // 保存されたデータを読み込む
        this.bindEvents();
        this.setCurrentDateTime();
        this.updateRecordCount();
        this.updateMonthFilter();
        this.displayRecords();
        this.checkSameDayRecords();
        this.startAutoBackup();
        this.checkStorageAvailability();
    }

    // ストレージの利用可能性をチェック
    checkStorageAvailability() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
        } catch (e) {
            this.showNotification('データの保存に問題が発生しています。ブラウザの設定を確認してください。', 'error');
        }
    }

    // 自動バックアップの開始
    startAutoBackup() {
        // 5分ごとにバックアップを実行
        this.backupInterval = setInterval(() => {
            this.exportData(true); // サイレントバックアップ
        }, 5 * 60 * 1000);
    }

    // データをローカルストレージに保存
    saveData() {
        try {
            localStorage.setItem('drivingLogRecords', JSON.stringify(this.records));
            localStorage.setItem('drivingLogCurrentId', this.currentId.toString());
            localStorage.setItem('drivingLogLastBackup', new Date().toISOString());
        } catch (error) {
            console.error('データの保存に失敗しました:', error);
            this.showNotification('データの保存に失敗しました。ブラウザのストレージ容量を確認してください。', 'error');
        }
    }

    // ローカルストレージからデータを読み込む
    loadData() {
        try {
            const savedRecords = localStorage.getItem('drivingLogRecords');
            const savedCurrentId = localStorage.getItem('drivingLogCurrentId');
            const lastBackup = localStorage.getItem('drivingLogLastBackup');
            
            if (savedRecords) {
                this.records = JSON.parse(savedRecords);
            }
            if (savedCurrentId) {
                this.currentId = parseInt(savedCurrentId);
            }

            // 最後のバックアップから24時間以上経過している場合は警告
            if (lastBackup) {
                const lastBackupDate = new Date(lastBackup);
                const now = new Date();
                const hoursSinceLastBackup = (now - lastBackupDate) / (1000 * 60 * 60);
                
                if (hoursSinceLastBackup > 24) {
                    this.showNotification('最後のバックアップから24時間以上経過しています。データをエクスポートすることをお勧めします。', 'warning');
                }
            }
        } catch (error) {
            console.error('データの読み込みに失敗しました:', error);
            this.showNotification('データの読み込みに失敗しました。バックアップからの復元を試みてください。', 'error');
        }
    }

    loadSampleData() {
        const sampleRecords = [
            {
                id: 1,
                datetime: "2025-06-15T09:00",
                distance: "12000",
                destination: "川口市役所",
                alcoholCheck: "0.00",
                fuelRecord: ""
            },
            {
                id: 2,
                datetime: "2025-06-15T14:30",
                distance: "",
                destination: "現場事務所（さいたま市）",
                alcoholCheck: "",
                fuelRecord: "30.5"
            }
        ];
        
        this.records = sampleRecords;
        this.currentId = 3;
    }

    bindEvents() {
        // フォーム送信
        document.getElementById('driving-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addRecord();
        });

        // 月別フィルタ
        document.getElementById('month-filter').addEventListener('change', () => {
            this.displayRecords();
        });

        // エクスポート
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });

        // インポート
        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });

        document.getElementById('import-file').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.importData(e.target.files[0]);
            }
            e.target.value = ''; // Reset file input
        });

        // データクリア
        document.getElementById('clear-btn').addEventListener('click', () => {
            this.showConfirmDialog(
                'データクリア確認',
                '全ての記録を削除しますか？この操作は取り消せません。',
                () => this.clearAllData()
            );
        });

        // HTML5 ダイアログイベント
        const dialog = document.getElementById('confirm-dialog');
        
        document.getElementById('dialog-cancel').addEventListener('click', () => {
            this.hideConfirmDialog();
        });

        document.getElementById('dialog-confirm').addEventListener('click', () => {
            if (this.confirmCallback) {
                this.confirmCallback();
            }
            this.hideConfirmDialog();
        });

        // ESCキーでダイアログを閉じる（HTML5 dialogのデフォルト動作）
        dialog.addEventListener('cancel', (e) => {
            this.confirmCallback = null;
        });

        // ダイアログの外側クリックで閉じる
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                this.hideConfirmDialog();
            }
        });

        // 日時変更時の同一日チェック
        document.getElementById('datetime').addEventListener('change', () => {
            this.checkSameDayRecords();
        });
    }

    setCurrentDateTime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const datetime = `${year}-${month}-${day}T${hours}:${minutes}`;
        document.getElementById('datetime').value = datetime;
    }

    checkSameDayRecords() {
        const currentDateTime = document.getElementById('datetime').value;
        if (!currentDateTime) return;

        const currentDate = currentDateTime.split('T')[0];
        const sameDayRecords = this.records.filter(record => {
            const recordDate = record.datetime.split('T')[0];
            return recordDate === currentDate;
        });

        const isFirstRecord = sameDayRecords.length === 0;
        
        // 走行距離フィールドの設定
        const distanceField = document.getElementById('distance');
        const distanceRequired = document.getElementById('distance-required');
        const distanceNote = document.getElementById('distance-note');
        
        if (isFirstRecord) {
            distanceField.required = true;
            distanceRequired.textContent = '(必須)';
            distanceRequired.className = 'required-indicator';
            distanceNote.textContent = '同一日の1回目のため必須です';
        } else {
            distanceField.required = false;
            distanceRequired.textContent = '(任意)';
            distanceRequired.className = 'optional-indicator';
            distanceNote.textContent = '同一日の2回目以降は任意です';
        }

        // アルコールチェックフィールドの設定
        const alcoholField = document.getElementById('alcohol-check');
        const alcoholRequired = document.getElementById('alcohol-required');
        const alcoholNote = document.getElementById('alcohol-note');
        
        if (isFirstRecord) {
            alcoholField.required = true;
            alcoholRequired.textContent = '(必須)';
            alcoholRequired.className = 'required-indicator';
            alcoholNote.textContent = '同一日の1回目のため必須です';
        } else {
            alcoholField.required = false;
            alcoholRequired.textContent = '(任意)';
            alcoholRequired.className = 'optional-indicator';
            alcoholNote.textContent = '同一日の2回目以降は任意です';
        }
    }

    addRecord() {
        const datetime = document.getElementById('datetime').value;
        const destination = document.getElementById('destination').value;
        const purpose = document.getElementById('purpose').value;
        const distance = document.getElementById('distance').value;
        const fuel = document.getElementById('fuel').value;
        const alcohol = document.getElementById('alcohol').checked;

        if (!datetime || !destination) {
            this.showNotification('日時と目的地は必須項目です', 'error');
            return;
        }

        const record = {
            id: this.currentId++,
            datetime,
            destination,
            purpose,
            distance: distance ? parseFloat(distance) : null,
            fuel: fuel ? parseFloat(fuel) : null,
            alcohol
        };

        this.records.push(record);
        this.saveData();
        this.displayRecords();
        this.updateRecordCount();
        this.showNotification('記録を追加しました');
        this.resetForm();
    }

    validateRecord(record) {
        // 移動先は常に必須
        if (!record.destination) {
            this.showNotification('移動先は必須です', 'error');
            document.getElementById('destination').focus();
            return false;
        }

        // 同一日の初回記録チェック
        const recordDate = record.datetime.split('T')[0];
        const sameDayRecords = this.records.filter(r => {
            const rDate = r.datetime.split('T')[0];
            return rDate === recordDate;
        });

        const isFirstRecord = sameDayRecords.length === 0;

        if (isFirstRecord) {
            if (!record.distance) {
                this.showNotification('同一日の1回目は走行距離が必須です', 'error');
                document.getElementById('distance').focus();
                return false;
            }
            if (!record.alcoholCheck) {
                this.showNotification('同一日の1回目はアルコールチェックが必須です', 'error');
                document.getElementById('alcohol-check').focus();
                return false;
            }
        }

        return true;
    }

    resetForm() {
        document.getElementById('datetime').value = '';
        document.getElementById('destination').value = '';
        document.getElementById('purpose').value = '';
        document.getElementById('distance').value = '';
        document.getElementById('fuel').value = '';
        document.getElementById('alcohol').checked = false;
        this.setCurrentDateTime();
    }

    displayRecords() {
        const recordsContainer = document.getElementById('records-container');
        if (!recordsContainer) return;

        if (this.records.length === 0) {
            recordsContainer.innerHTML = `
                <div class="empty-state">
                    <p>記録がありません</p>
                    <p class="text-secondary">上記のフォームから新しい記録を追加してください。</p>
                </div>
            `;
            return;
        }

        // 日付でグループ化
        const groupedRecords = this.groupRecordsByDate(this.records);
        
        // 日付を降順（新しい順）にソート
        const sortedDates = Object.keys(groupedRecords).sort((a, b) => {
            const dateA = new Date(a.replace(/年|月|日/g, '/'));
            const dateB = new Date(b.replace(/年|月|日/g, '/'));
            return dateB - dateA;
        });

        // 記録一覧を生成
        let html = '';
        for (const date of sortedDates) {
            const records = groupedRecords[date];
            // 各日付内の記録を時間の降順（新しい順）にソート
            records.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
            
            html += `
                <div class="date-card">
                    <div class="date-card__header">${date}</div>
                    ${records.map(record => this.createRecordEntry(record)).join('')}
                </div>
            `;
        }
        
        recordsContainer.innerHTML = html;
    }

    groupRecordsByDate(records) {
        return records.reduce((groups, record) => {
            const date = record.datetime.split('T')[0];
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(record);
            return groups;
        }, {});
    }

    createRecordEntry(record) {
        const time = record.datetime.split(' ')[1];
        const location = record.destination || '未設定';
        const purpose = record.purpose || '未設定';
        const distance = record.distance ? `${record.distance}km` : '未設定';
        const fuel = record.fuel ? `${record.fuel}L` : '未設定';
        const alcohol = record.alcohol ? '実施済' : '未実施';

        return `
            <div class="record-entry" data-id="${record.id}">
                <div class="record-time">${time}</div>
                <div class="record-details">
                    <div class="record-location">${location}</div>
                    <div class="record-purpose">${purpose}</div>
                    <div class="record-stats">
                        <span class="record-distance">走行距離: ${distance}</span>
                        <span class="record-fuel">給油量: ${fuel}</span>
                        <span class="record-alcohol">アルコールチェック: ${alcohol}</span>
                    </div>
                </div>
            </div>
        `;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
    }

    updateRecordCount() {
        document.getElementById('record-count').textContent = `記録件数: ${this.records.length}件`;
    }

    updateMonthFilter() {
        const select = document.getElementById('month-filter');
        const currentValue = select.value;
        
        // 既存のオプション（最初のオプション以外）を削除
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        const months = [...new Set(this.records.map(record => record.datetime.substring(0, 7)))];
        months.sort().reverse();

        months.forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            const date = new Date(month + '-01');
            option.textContent = date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
            select.appendChild(option);
        });
        
        // 前の選択を復元
        if (currentValue && months.includes(currentValue)) {
            select.value = currentValue;
        }
    }

    exportData(silent = false) {
        try {
            const data = {
                records: this.records,
                currentId: this.currentId,
                exportDate: new Date().toISOString(),
                version: '0.92'
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `driving_log_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            if (!silent) {
                this.showNotification('データをエクスポートしました', 'success');
            }
        } catch (error) {
            console.error('エクスポートに失敗しました:', error);
            this.showNotification('エクスポートに失敗しました', 'error');
        }
    }

    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // バージョンチェック
                if (data.version && data.version !== '0.92') {
                    this.showNotification('異なるバージョンのデータです。インポートを中止します。', 'error');
                    return;
                }

                if (data.records && Array.isArray(data.records)) {
                    this.records = data.records;
                    this.currentId = data.currentId || this.currentId;
                    this.saveData();
                    this.updateRecordCount();
                    this.updateMonthFilter();
                    this.displayRecords();
                    this.showNotification('データをインポートしました', 'success');
                } else {
                    throw new Error('無効なデータ形式です');
                }
            } catch (error) {
                console.error('インポートに失敗しました:', error);
                this.showNotification('インポートに失敗しました。ファイルが正しい形式か確認してください。', 'error');
            }
        };
        reader.readAsText(file);
    }

    clearAllData() {
        this.records = [];
        this.currentId = 1;
        this.saveData(); // データを保存
        this.updateRecordCount();
        this.updateMonthFilter();
        this.displayRecords();
        this.showNotification('全ての記録を削除しました', 'success');
    }

    // HTML5 Dialog を使用した確認ダイアログ
    showConfirmDialog(title, message, callback) {
        const dialog = document.getElementById('confirm-dialog');
        document.getElementById('dialog-title').textContent = title;
        document.getElementById('dialog-message').textContent = message;
        this.confirmCallback = callback;
        
        // HTML5 dialog の showModal() を使用
        dialog.showModal();
    }

    hideConfirmDialog() {
        const dialog = document.getElementById('confirm-dialog');
        dialog.close();
        this.confirmCallback = null;
    }

    showNotification(message, type = 'success', duration = 5000) {
        const notification = document.getElementById('notification');
        const notificationMessage = document.getElementById('notification-message');
        
        notification.className = `notification notification--${type}`;
        notificationMessage.textContent = message;
        notification.classList.remove('hidden');
        
        // エラーや警告の場合は長めに表示
        if (type === 'error' || type === 'warning') {
            duration = 10000;
        }
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, duration);
    }
}

// Object.groupBy のポリフィル（必要に応じて）
if (!Object.groupBy) {
    Object.groupBy = function(items, keyFn) {
        return items.reduce((result, item) => {
            const key = keyFn(item);
            if (!result[key]) {
                result[key] = [];
            }
            result[key].push(item);
            return result;
        }, {});
    };
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    // HTML5 dialog サポートチェック
    const dialog = document.createElement('dialog');
    if (typeof dialog.showModal !== 'function') {
        console.warn('HTML5 dialog not supported. Falling back to custom modal.');
        // ここで代替実装を行うか、ポリフィルを読み込む
    }
    
    new DrivingLogApp();
});

// モーダルの制御
const modal = {
    element: document.getElementById('confirm-modal'),
    title: document.getElementById('modal-title'),
    message: document.getElementById('modal-message'),
    confirmBtn: document.getElementById('modal-confirm'),
    cancelBtn: document.getElementById('modal-cancel'),

    show(title, message, onConfirm) {
        this.title.textContent = title;
        this.message.textContent = message;
        this.element.classList.add('show');
        
        // イベントリスナーの設定
        const handleConfirm = () => {
            this.hide();
            if (onConfirm) onConfirm();
        };

        const handleCancel = () => {
            this.hide();
        };

        this.confirmBtn.onclick = handleConfirm;
        this.cancelBtn.onclick = handleCancel;
    },

    hide() {
        this.element.classList.remove('show');
        this.confirmBtn.onclick = null;
        this.cancelBtn.onclick = null;
    }
};

// 現在の日時を取得する関数（日本時間）
function getCurrentDateTime() {
    // 日本時間を取得
    const now = new Date();
    const jstOffset = 9 * 60; // 日本時間のオフセット（分）
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const jst = new Date(utc + (jstOffset * 60000));
    
    const year = jst.getFullYear();
    const month = String(jst.getMonth() + 1).padStart(2, '0');
    const day = String(jst.getDate()).padStart(2, '0');
    const hours = String(jst.getHours()).padStart(2, '0');
    const minutes = String(jst.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// フォームの処理
document.getElementById('driving-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // 日時が入力されていない場合は現在の日時を設定
    const datetimeInput = document.getElementById('datetime');
    if (!datetimeInput.value) {
        datetimeInput.value = getCurrentDateTime();
    }
    
    const formData = {
        distance: document.getElementById('distance').value,
        destination: document.getElementById('destination').value,
        datetime: datetimeInput.value,
        alcoholCheck: document.getElementById('alcohol-check').value,
        fuelRecord: document.getElementById('fuel-record').value
    };

    // データの保存
    google.script.run
        .withSuccessHandler(function(response) {
            showNotification('記録が保存されました', 'success');
            document.getElementById('driving-form').reset();
            updateRecordCount();
        })
        .withFailureHandler(function(error) {
            showNotification('エラーが発生しました: ' + error, 'error');
        })
        .saveDrivingLog(formData);
});

// 通知の表示
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    
    notification.className = `notification ${type}`;
    notificationMessage.textContent = message;
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// 記録件数の更新
function updateRecordCount() {
    google.script.run
        .withSuccessHandler(function(count) {
            document.getElementById('record-count').textContent = `記録件数: ${count}件`;
        })
        .getRecordCount();
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    updateRecordCount();
    
    // 日時入力フィールドのプレースホルダーを現在の日時に設定
    const datetimeInput = document.getElementById('datetime');
    datetimeInput.placeholder = getCurrentDateTime();
});