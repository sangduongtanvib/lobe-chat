#!/bin/bash

# Test script for API keys functionality
LANGUAGE="en_US"
SED_COMMAND="sed -i ''"

show_message() {
    local key="$1"
    case $key in
        ask_configure_api_keys)
            case $LANGUAGE in
                zh_CN)
                    echo "是否要配置 API 密钥？（Azure、AWS 等）"
                ;;
                *)
                    echo "Do you want to configure API keys? (Azure, AWS, etc.)"
                ;;
            esac
        ;;
        api_keys_intro)
            case $LANGUAGE in
                zh_CN)
                    echo "配置 API 密钥（为了安全起见，这些密钥不会保存在配置文件中）"
                    echo "请输入以下 API 密钥（可选，留空则跳过）："
                ;;
                *)
                    echo "Configure API Keys (For security reasons, these keys will not be saved in config files)"
                    echo "Please enter the following API keys (optional, leave blank to skip):"
                ;;
            esac
        ;;
        ask_azure_api_key)
            echo "Azure API Key:"
        ;;
        ask_azure_endpoint)
            echo "Azure Endpoint:"
        ;;
        ask_aws_access_key)
            echo "AWS Access Key ID:"
        ;;
        ask_aws_secret_key)
            echo "AWS Secret Access Key:"
        ;;
        api_keys_completed)
            echo "✔️ API keys configuration completed"
        ;;
    esac
}

ask() {
    local prompt="$1"
    local default="$2"
    local description="$3"
    if [ -n "$description" ]; then
        description="$description "
    fi
    local result
    
    if [ -n "$default" ]; then
        read -p "$prompt [${description}${default}]: " result
        result=${result:-$default}
    else
        read -p "$prompt: " result
    fi
    ask_result=$(echo "$result" | xargs)
}

section_configure_api_keys() {
    show_message "api_keys_intro"
    
    # Azure API Key
    show_message "ask_azure_api_key"
    ask "AZURE_API_KEY" ""
    if [ -n "$ask_result" ]; then
        echo "Would add: AZURE_API_KEY=$ask_result"
    fi
    
    # Azure Endpoint
    show_message "ask_azure_endpoint"
    ask "AZURE_ENDPOINT" ""
    if [ -n "$ask_result" ]; then
        echo "Would add: AZURE_ENDPOINT=$ask_result"
    fi
    
    # AWS Access Key ID
    show_message "ask_aws_access_key"
    ask "AWS_ACCESS_KEY_ID" ""
    if [ -n "$ask_result" ]; then
        echo "Would add: AWS_ACCESS_KEY_ID=$ask_result"
    fi
    
    # AWS Secret Access Key
    show_message "ask_aws_secret_key"
    ask "AWS_SECRET_ACCESS_KEY" ""
    if [ -n "$ask_result" ]; then
        echo "Would add: AWS_SECRET_ACCESS_KEY=$ask_result"
    fi
    
    show_message "api_keys_completed"
}

# Test the API keys section
echo "Testing API Keys Configuration..."
show_message "ask_configure_api_keys"
ask "(y/n)" "y"
if [[ "$ask_result" == "y" ]]; then
    section_configure_api_keys
fi

echo "Test completed!"
