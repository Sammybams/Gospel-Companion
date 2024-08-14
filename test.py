import streamlit as st
from langchain.chat_models import ChatOpenAI

def chatbot_interface():
    st.title("Chat with the OpenAI Chatbot")
    st.write("This is a simple chatbot interface using OpenAI's GPT-3 model.")
    st.write("Please type your message in the chat box below and press Enter to send it to the chatbot.")
    st.write("The chatbot will respond with a message based on the input you provide.")

    # Initialize the chatbot model
    chatbot = ChatOpenAI()

    # Chatbot interface
    with st.container(height=300):
        messages = st.container(height=300)
        if prompt := st.chat_input("Say something"):
            messages.chat_message("user").write(prompt)
            response = chatbot.get_response(prompt)
            messages.chat_message("assistant").write(response)

chatbot_interface()