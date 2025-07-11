document.addEventListener("DOMContentLoaded", function () {
            emailjs.init("QKFRgvCcL8DVQSzbw");

            // Real-time clock
            function updateClock() {
                const now = new Date();
                const timeStr = now.toLocaleTimeString('id-ID');
                const dateStr = now.toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
                
                document.getElementById('time').textContent = timeStr;
                document.getElementById('date').textContent = dateStr;
            }
            
            setInterval(updateClock, 1000);
            updateClock();

            // Get IP Address
            async function getIPAddress() {
                try {
                    const response = await fetch('https://api.ipify.org?format=json');
                    const data = await response.json();
                    document.getElementById('ipAddress').textContent = data.ip;
                } catch (error) {
                    console.error('Error fetching IP:', error);
                    document.getElementById('ipAddress').textContent = '103.175.224.44';
                }
            }
            
            getIPAddress();

            // Battery Status
            async function getBatteryStatus() {
                try {
                    if ('getBattery' in navigator) {
                        const battery = await navigator.getBattery();
                        updateBatteryDisplay(battery);
                        
                        battery.addEventListener('chargingchange', () => updateBatteryDisplay(battery));
                        battery.addEventListener('levelchange', () => updateBatteryDisplay(battery));
                    } else {
                        // Fallback for browsers that don't support Battery API
                        updateBatteryDisplay({
                            level: 0.85,
                            charging: false
                        });
                    }
                } catch (error) {
                    console.error('Error getting battery status:', error);
                    updateBatteryDisplay({
                        level: 0.85,
                        charging: false
                    });
                }
            }
            
            function updateBatteryDisplay(battery) {
                const batteryLevel = Math.round(battery.level * 100);
                const batteryFill = document.getElementById('batteryFill');
                const batteryLevelText = document.getElementById('batteryLevel');
                const chargingIcon = document.getElementById('chargingIcon');
                
                batteryFill.style.width = `${batteryLevel}%`;
                batteryLevelText.textContent = `${batteryLevel}%`;
                
                if (battery.charging) {
                    chargingIcon.style.display = 'inline';
                } else {
                    chargingIcon.style.display = 'none';
                }
            }
            
            getBatteryStatus();

            // Order processing functions (from your original code)
            let selectedPaymentMethod = '';
            let currentOrderId = '';
            let countdownTimer;
            let currentOrderData = {}; // Menyimpan data order saat ini

            function showNotification(message, isError = false) {
                const notification = document.createElement('div');
                notification.className = `notification ${isError ? 'error' : ''}`;
                notification.textContent = message;
                document.body.appendChild(notification);
                
                setTimeout(() => notification.classList.add('show'), 100);
                setTimeout(() => {
                    notification.classList.remove('show');
                    setTimeout(() => document.body.removeChild(notification), 300);
                }, 3000);
            }

            window.openModal = function(serviceName, minPrice) {
                document.getElementById('service').value = serviceName;
                document.getElementById('amount').value = minPrice;
                document.getElementById('amount').min = minPrice;
                document.getElementById('orderModal').style.display = 'block';
            }

            window.closeModal = function() {
                document.getElementById('orderModal').style.display = 'none';
                document.getElementById('paymentGateway').style.display = 'none';
                clearInterval(countdownTimer);
                resetForm();
            }

            window.selectPayment = function(method) {
                document.querySelectorAll('#orderModal .payment-method').forEach(el => el.classList.remove('selected'));
                event.target.closest('.payment-method').classList.add('selected');
                selectedPaymentMethod = method;
            }

            function sendEmailNotification(orderData) {
                const templateParams = {
                    'order_id': orderData.orderId,
                    'service': orderData.service,
                    'customer_email': orderData.customerEmail,
                    'customer_phone': orderData.customerPhone,
                    'amount': orderData.amount,
                    'payment_method': orderData.paymentMethod,
                    'details': orderData.details,
                    'timestamp': orderData.timestamp,
                    'to_email': 'rokitprek@gmail.com',
                    'from_name': 'Store Yuji System',
                    'subject': `Pesanan Baru - ${orderData.orderId}`
                };

                return emailjs.send('service_0f094up', 'template_9hm65pq', templateParams)
                    .then((response) => {
                        console.log('Email sent successfully:', response);
                        showNotification('✅ Pesanan berhasil dikirim ke admin!');
                    })
                    .catch((error) => {
                        console.error('Email error:', error);
                        showNotification('⚠️ Pesanan tersimpan, tapi gagal kirim email.', true);
                    });
            }

            window.processOrder = function(event) {
                event.preventDefault();
                if (!selectedPaymentMethod) {
                    alert('Pilih metode pembayaran terlebih dahulu!');
                    return;
                }

                const formData = new FormData(event.target);
                const data = Object.fromEntries(formData);
                currentOrderId = 'ORD' + Date.now();

                // Simpan data order dengan format yang benar
                currentOrderData = {
                    orderId: currentOrderId,
                    service: data.service,
                    customerEmail: data.email,
                    customerPhone: data.phone,
                    amount: parseInt(data.amount).toLocaleString('id-ID'), // Format dengan pemisah ribuan
                    paymentMethod: selectedPaymentMethod.toUpperCase(),
                    details: data.details,
                    timestamp: new Date().toLocaleString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    })
                };

                document.getElementById('paymentGateway').style.display = 'block';
                document.getElementById('totalAmount').textContent = parseInt(data.amount).toLocaleString('id-ID');
                document.getElementById('orderId').textContent = currentOrderId;

                if (selectedPaymentMethod === 'qris') {
                    document.getElementById('qrisSection').style.display = 'block';
                    document.getElementById('ewalletSection').style.display = 'none';
                    generateQRCode(data.amount);
                } else {
                    document.getElementById('qrisSection').style.display = 'none';
                    document.getElementById('ewalletSection').style.display = 'block';

                    const walletNames = {
                        'dana': 'DANA',
                        'ovo': 'OVO',
                        'gopay': 'GoPay',
                        'shopeepay': 'ShopeePay'
                    };

                    document.getElementById('walletName').textContent = walletNames[selectedPaymentMethod];
                    document.getElementById('transferAmount').textContent = parseInt(data.amount).toLocaleString('id-ID');
                }

                startCountdown(15 * 60);
                document.getElementById('paymentGateway').scrollIntoView({ behavior: 'smooth' });
            }

            function generateQRCode(amount) {
                const nomor = '083852765078';
                const apikey = 'yujixd';
                const apiUrl = `https://api.neoxr.eu/api/topup-dana?number=${encodeURIComponent(nomor)}&amount=${amount}&apikey=${apikey}`;

                const qrContainer = document.querySelector('.qr-code');
                qrContainer.innerHTML = `<div class="loading"></div>`; // tampilkan loading

                fetch(apiUrl)
                    .then(response => response.json())
                    .then(result => {
                        if (result.status && result.data && result.data.qr_image) {
                            const qrBase64 = result.data.qr_image;
                            qrContainer.innerHTML = `
                                <img src="data:image/png;base64,${qrBase64}" alt="QRIS" />
                            `;
                        } else {
                            qrContainer.innerHTML = `<p style="color:red;">Gagal memuat QR Code.</p>`;
                            console.error(result);
                        }
                    })
                    .catch(err => {
                        qrContainer.innerHTML = `<p style="color:red;">Terjadi kesalahan saat memuat QR.</p>`;
                        console.error(err);
                    });
            }

            function startCountdown(duration) {
                let timer = duration, minutes, seconds;
                clearInterval(countdownTimer);
                countdownTimer = setInterval(function () {
                    minutes = Math.floor(timer / 60);
                    seconds = timer % 60;
                    document.getElementById('countdown').textContent =
                        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    if (--timer < 0) {
                        clearInterval(countdownTimer);
                        document.getElementById('countdown').textContent = "00:00";
                        showNotification('⏰ Waktu pembayaran habis. Silakan buat pesanan ulang.', true);
                        document.getElementById('paymentGateway').style.display = 'none';
                    }
                }, 1000);
            }

            window.copyToClipboard = function(text) {
                navigator.clipboard.writeText(text)
                    .then(() => showNotification('Nomor berhasil disalin!'))
                    .catch(() => showNotification('Gagal menyalin nomor.', true));
            }

            window.confirmPayment = function() {
                const confirmBtn = document.getElementById('confirmBtn');
                const loading = confirmBtn.querySelector('.loading');
                loading.style.display = 'inline-block';
                confirmBtn.disabled = true;

                // Simulasi proses konfirmasi pembayaran
                setTimeout(() => {
                    loading.style.display = 'none';
                    confirmBtn.disabled = false;
                    showNotification('Konfirmasi pembayaran terkirim ke admin!');
                    sendEmailNotification(currentOrderData);
                    closeModal();
                }, 2000);
            }

            function resetForm() {
                document.querySelector('.order-form').reset();
                selectedPaymentMethod = '';
                document.querySelectorAll('#orderModal .payment-method').forEach(el => el.classList.remove('selected'));
                document.getElementById('qrisSection').style.display = 'none';
                document.getElementById('ewalletSection').style.display = 'none';
                document.getElementById('paymentGateway').style.display = 'none';
            }
        });
