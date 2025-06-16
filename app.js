// 運転日誌アプリケーション - HTML5 Dialog対応版
class DrivingLog {
    constructor() {
        this.records = [];
        this.currentId = 1;
        this.version = '0.92';
        this.lastUpdate = new Date().toISOString();
        this.confirmCallback = null;
        this.backupInterval = null;
        this.init();
    }

    init() {
        console.log('初期化を開始します');
        this.loadData();
        this.bindEvents();
        this.setCurrentDateTime();
        this.updateRecordCount();
        this.updateMonthFilter();
        this.displayRecords();
        this.checkSameDayRecords();
        this.startAutoBackup();
        this.checkStorageAvailability();
        console.log('初期化が完了しました');
    }

    // データをローカルストレージに保存
    saveData() {
        try {
            const data = {
                records: this.records,
                currentId: this.currentId,
                version: this.version,
                lastUpdate: this.lastUpdate
            };
            console.log('保存するデータ:', data);
            localStorage.setItem('drivingLog', JSON.stringify(data));
            console.log('データを保存しました');
        } catch (error) {
            console.error('データの保存に失敗しました:', error);
            this.showNotification('データの保存に失敗しました', 'error');
        }
    }

    // ローカルストレージからデータを読み込む
    loadData() {
        try {
            console.log('データの読み込みを開始します');
            const data = localStorage.getItem('drivingLog');
            if (data) {
                const parsedData = JSON.parse(data);
                console.log('読み込んだデータ:', parsedData);
                this.records = parsedData.records || [];
                this.currentId = parsedData.currentId || 1;
                this.version = parsedData.version || this.version;
                this.lastUpdate = parsedData.lastUpdate || this.lastUpdate;
                console.log('データの読み込みが完了しました');
            } else {
                console.log('保存されたデータがありません');
            }
        } catch (error) {
            console.error('データの読み込みに失敗しました:', error);
            this.showNotification('データの読み込みに失敗しました', 'error');
        }
    }

    addRecord() {
        console.log('記録の追加を開始します');
        const datetime = document.getElementById('datetime').value;
        const destination = document.getElementById('destination').value;
        const purpose = document.getElementById('purpose').value;
        const distance = document.getElementById('distance').value;
        const fuel = document.getElementById('fuel').value;
        const alcohol = document.getElementById('alcohol').checked;

        console.log('入力値:', { datetime, destination, purpose, distance, fuel, alcohol });

        if (!datetime || !destination) {
            console.log('必須項目が入力されていません');
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

        console.log('新しい記録:', record);

        this.records.push(record);
        console.log('記録を配列に追加しました');

        this.saveData();
        console.log('データを保存しました');

        this.displayRecords();
        console.log('記録一覧を更新しました');

        this.updateRecordCount();
        console.log('記録数を更新しました');

        this.showNotification('記録を追加しました');
        this.resetForm();
        console.log('記録の追加が完了しました');
    }

    initializeEventListeners() {
        this.bindEvents();
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
        console.log('イベントリスナーを設定します');
        document.getElementById('addButton').addEventListener('click', () => this.addRecord());
        document.getElementById('exportButton').addEventListener('click', () => this.exportData());
        document.getElementById('importButton').addEventListener('click', () => this.importData());
        document.getElementById('clearButton').addEventListener('click', () => this.clearAllRecords());
        document.getElementById('monthFilter').addEventListener('change', () => this.displayRecords());
        console.log('イベントリスナーの設定が完了しました');
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
        if (!recordsContainer) {
            console.error('records-containerが見つかりません');
            return;
        }

        console.log('記録を表示します:', this.records);

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
        console.log('グループ化した記録:', groupedRecords);
        
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
        console.log('記録一覧を更新しました');
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

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const notificationMessage = document.getElementById('notification-message');
        
        notification.className = `notification notification--${type}`;
        notificationMessage.textContent = message;
        notification.classList.remove('hidden');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new DrivingLog();
});