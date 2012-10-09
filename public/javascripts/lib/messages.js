'use strict';

define(['jquery', 'commands', 'time-format', 'version-timeout'],
  function($, commands, timeFormat, versionTimeout) {

  var myEmailHash = $('body').data('email-hash');
  var messageList = $('body #messages ol');
  var currentChannel = $('body').data('channel');
  var logLimit = 80;
  var mediaLimit = 10;
  var myPost = false;
  var mediaIframeMatcher = /<iframe\s.+><\/iframe>/i;
  var mediaObjectMatcher = /<object\s.+><\/object>/i;
  var mediaVideoMatcher = /<video\s.+>.+<\/video>/i;
  var mediaAudioMatcher = /<audio\s.+>.+<\/audio>/i;
  var mediaImageMatcher = /\.((jpg)|(jpeg)|(png)|(gif))<\/a>/i;
  var isSubmitting = false;
  var mediaColumn = $('#media ol');

  var determineClientOrServer = function(data, highlight, messageContent) {
    var msg = '';

    if (data.is_client_only) {
      msg = $('<li class="client ' + data.font + ' ' + highlight + '" data-created="' +
                  data.created + '"><p></p></li>');
      msg.find('p').html(messageContent);

    } else if (data.is_action) {
      msg = $('<li class="action font' + data.font + '" data-created="' + data.created +
              '"><p></p></li>');
      msg.find('p').html(messageContent);

      // if this is a nick change, set the nick in the dom for the user
      if (data.action_type === 'nick' && myPost) {
        var oldNick = $('body').data('nick');
        $('body').data('nick', data.nickname.replace(/\s/, ''));

        // The user list clears out every hour so let's remove the user's old name from the list
        // if they succesfully updated
        //myUserList = userList;
      }

    } else {
      var nickReference = data.message.split(': ')[0];

      if (nickReference) {
        nickReference = nickReference.replace(/\s/, '');
        // Allow highlighting of a message even if it is to yourself
        if (nickReference === $('body').data('nick')) {
          highlight = 'nick-highlight';
        }
      }

      msg = $('<li class="font' + data.font + ' ' + highlight +
        '" data-created="' + data.created +
        '"><img class="avatar"><span class="nick">' + data.nickname + '</span>' +
        '<time>' + timeFormat.getMessageDateTimeString(data) + '</time><p class="msg"></p></li>');

      msg.find('img').attr('src', data.gravatar);
      msg.find('p.msg').html(messageContent);
    }

    // Apply log limiter
    $('body ol li:nth-child(n+' + logLimit +')').remove();

    // Add new message
    messageList.prepend(msg);
  };

  var self = {
    clearUnreadMessages: function() {
      document.title = '#' + currentChannel;
    },

    updateMedia: function(data) {
      var message = $.trim(data.message);

      // Update the media
      if(message.match(mediaIframeMatcher) ||
        message.match(mediaObjectMatcher) ||
        message.match(mediaVideoMatcher) ||
        message.match(mediaAudioMatcher) ||
        (message.match(mediaImageMatcher) &&
        message.indexOf('class="emoti"') === -1)) {

        var mediaItem = $('<li class="font' + data.font + '" data-created="' + data.created +'"></li>');

        mediaColumn.prepend(mediaItem.html(message + '<a href="#" class="delete">x</a>'));
        if (mediaColumn.find('li').length > mediaLimit) {
          mediaColumn.find('li:last-child').remove();
        }
      }
    },

    updateMessage: function(data) {
      // Update the message
      var message = $.trim(data.message);
      var msg = '';
      var highlight = '';

      if (data.is_client_only) {
        highlight = 'nick-highlight';
      }

      if (message.length > 0 && $('ol li[data-created="' + data.created + '"]').length === 0) {
        determineClientOrServer(data, highlight, message);
      }

      if (myPost) {
        this.clearUnreadMessages();

      } else {
        document.title = ' * #' + $('body').data('channel');
      }

      myPost = false;
      versionTimeout.checkVersion();
    },

    postMessage: function(formEl) {
      myPost = true;
      commands.hideAllCommands();

      var self = this;
      var commandIsMatched = commands.checkCommands(formEl);

      if(!commandIsMatched && !isSubmitting) {
        isSubmitting = true;

        $.ajax({
          type: 'POST',
          url: formEl.attr('action'),
          data: formEl.serialize(),
          success: function(data) {
            $('form input').val('');
            self.clearUnreadMessages();
            self.updateMessage(data);
            self.updateMedia(data);
            isSubmitting = false;
          },
          dataType: 'json'
        });

        commandIsMatched = false;
      }
    }
  };

  return self;
});
