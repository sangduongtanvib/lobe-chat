#!/bin/bash
# build-and-transfer.sh

IMAGE_NAME="duongsang97/vib-chat"
IMAGE_TAG="latest"
FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"
VM_USER="rootvibgpt"
VM_IP="10.213.158.6"
VM_PATH="~"

echo "Building image for amd64 with tag: ${FULL_IMAGE_NAME}..."
docker buildx build \
  --memory=8g \
  --memory-swap=8g \
  --platform=linux/amd64 \
  --load \
  -f Dockerfile.databasev2 \
  -t ${FULL_IMAGE_NAME} .

echo "Saving and compressing image..."
docker save ${FULL_IMAGE_NAME} | gzip > vib-chat-amd64.tar.gz

# Get file size for user information
FILE_SIZE=$(ls -lh vib-chat-amd64.tar.gz | awk '{print $5}')
echo "Image compressed successfully! Size: ${FILE_SIZE}"
echo "Image tag: ${FULL_IMAGE_NAME}"

# Ask user if they want to transfer to VM
echo ""
read -p "Bạn có muốn upload image này lên VM không? (y/n): " -n 1 -r
echo    # Move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Transferring to VM..."
    scp vib-chat-amd64.tar.gz ${VM_USER}@${VM_IP}:${VM_PATH}
    
    if [ $? -eq 0 ]; then
        echo "Transfer completed successfully!"
        echo "Now run on VM: gunzip -c vib-chat-amd64.tar.gz | docker load"
        echo "Image will be available as: ${FULL_IMAGE_NAME}"
    else
        echo "Transfer failed! Please check your connection settings."
        exit 1
    fi
else
    echo "Skipping transfer to VM."
    echo "Image file saved locally: vib-chat-amd64.tar.gz"
fi

# Ask user if they want to clean up local file
echo ""
read -p "Bạn có muốn xóa file nén local không? (y/n): " -n 1 -r
echo    # Move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleaning up local compressed file..."
    rm vib-chat-amd64.tar.gz
    echo "Local file cleaned up."
else
    echo "Keeping local file: vib-chat-amd64.tar.gz"
fi

echo "Done!"
echo "Image tag: ${FULL_IMAGE_NAME}"