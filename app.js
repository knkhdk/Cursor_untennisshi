// 運転日誌アプリケーション - HTML5 Dialog対応版
class DrivingLogApp {
    constructor() {
        this.records = [];
        this.currentId = 1;
        this.confirmCallback = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.setCurrentDateTime();
        this.loadSampleData();
        this.updateRecordCount();
        this.updateMonthFilter();
        this.displayRecords();
        this.checkSameDayRecords();
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
        const dateTimeString = now.toISOString().slice(0, 16);
        document.getElementById('datetime').value = dateTimeString;
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
        const record = {
            id: this.currentId++,
            datetime: document.getElementById('datetime').value,
            distance: document.getElementById('distance').value.trim(),
            destination: document.getElementById('destination').value.trim(),
            alcoholCheck: document.getElementById('alcohol-check').value.trim(),
            fuelRecord: document.getElementById('fuel-record').value.trim()
        };

        // バリデーション
        if (!this.validateRecord(record)) {
            return;
        }

        this.records.push(record);
        this.records.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
        
        this.updateRecordCount();
        this.updateMonthFilter();
        this.displayRecords();
        this.resetForm();
        this.showNotification('記録を追加しました', 'success');
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
        document.getElementById('driving-form').reset();
        document.getElementById('alcohol-check').value = '0.00';
        this.setCurrentDateTime();
        this.checkSameDayRecords();
    }

    displayRecords() {
        const container = document.getElementById('records-container');
        const monthFilter = document.getElementById('month-filter').value;
        
        let filteredRecords = this.records;
        if (monthFilter) {
            filteredRecords = this.records.filter(record => {
                const recordMonth = record.datetime.substring(0, 7);
                return recordMonth === monthFilter;
            });
        }

        if (filteredRecords.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>記録がありません</p>
                    <p class="text-secondary">上記のフォームから新しい記録を追加してください。</p>
                </div>
            `;
            return;
        }

        // 日付別にグループ化
        const groupedRecords = this.groupRecordsByDate(filteredRecords);
        
        container.innerHTML = '';
        Object.keys(groupedRecords).sort().reverse().forEach(date => {
            const dateCard = this.createDateCard(date, groupedRecords[date]);
            container.appendChild(dateCard);
        });
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

    createDateCard(date, records) {
        const card = document.createElement('div');
        card.className = 'record-card';

        const formattedDate = this.formatDate(date);
        
        card.innerHTML = `
            <div class="record-card__header">
                <h3 class="record-card__date">${formattedDate}</h3>
            </div>
            <div class="record-card__body">
                <div class="record-entries">
                    ${records.map(record => this.createRecordEntry(record)).join('')}
                </div>
            </div>
        `;

        return card;
    }

    createRecordEntry(record) {
        const time = record.datetime.split('T')[1];
        const formattedTime = time ? time.substring(0, 5) : '';

        return `
            <div class="record-entry">
                <div class="record-entry__time">${formattedTime}</div>
                <div class="record-entry__details">
                    <div class="detail-item">
                        <div class="detail-item__label">走行距離</div>
                        <div class="detail-item__value ${!record.distance ? 'empty' : ''}">
                            ${record.distance || '記録なし'} ${record.distance ? 'km' : ''}
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item__label">移動先</div>
                        <div class="detail-item__value">${record.destination}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item__label">アルコールチェック</div>
                        <div class="detail-item__value ${!record.alcoholCheck ? 'empty' : ''}">
                            ${record.alcoholCheck || '記録なし'} ${record.alcoholCheck ? 'mg' : ''}
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item__label">給油記録</div>
                        <div class="detail-item__value ${!record.fuelRecord ? 'empty' : ''}">
                            ${record.fuelRecord || '給油なし'} ${record.fuelRecord ? 'L' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'short'
        };
        return date.toLocaleDateString('ja-JP', options);
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

    exportData() {
        if (this.records.length === 0) {
            this.showNotification('エクスポートする記録がありません', 'warning');
            return;
        }

        const dataStr = JSON.stringify(this.records, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `driving-log-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        this.showNotification('データをエクスポートしました', 'success');
    }

    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedRecords = JSON.parse(e.target.result);
                
                if (!Array.isArray(importedRecords)) {
                    throw new Error('Invalid data format');
                }

                // データの検証
                const validRecords = importedRecords.filter(record => {
                    return record.id && record.datetime && record.destination;
                });

                if (validRecords.length === 0) {
                    throw new Error('No valid records found');
                }

                this.showConfirmDialog(
                    'データインポート確認',
                    `${validRecords.length}件の記録をインポートします。現在のデータは上書きされます。よろしいですか？`,
                    () => {
                        this.records = validRecords;
                        this.currentId = Math.max(...this.records.map(r => r.id), 0) + 1;
                        this.updateRecordCount();
                        this.updateMonthFilter();
                        this.displayRecords();
                        this.checkSameDayRecords();
                        this.showNotification(`${validRecords.length}件の記録をインポートしました`, 'success');
                    }
                );
            } catch (error) {
                this.showNotification('データの読み込みに失敗しました。正しいJSONファイルを選択してください。', 'error');
            }
        };
        reader.readAsText(file);
    }

    clearAllData() {
        this.records = [];
        this.currentId = 1;
        
        // 月別フィルタをリセット
        const select = document.getElementById('month-filter');
        select.innerHTML = '<option value="">全ての月</option>';
        
        this.updateRecordCount();
        this.displayRecords();
        this.checkSameDayRecords();
        this.showNotification('全てのデータを削除しました', 'success');
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

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const messageElement = document.getElementById('notification-message');
        
        messageElement.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.remove('hidden');

        setTimeout(() => {
            notification.classList.add('hidden');
        }, 4000);
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