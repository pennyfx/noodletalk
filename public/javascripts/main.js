'use strict';

requirejs.config({
  baseUrl: '/javascripts/lib',
  enforceDefine: true,
  paths: {
    jquery: 'http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min'
  }
});

define(['jquery', 'commands', 'messages', 'users'],
  function($, commands, messages, users) {

  var currentChannel = $('body').data('channel');
  var messageForm = $('#message');
  var login = $('#login');
  var socket = io.connect(location.protocol + '//' + location.hostname +
    (location.port ? ':' + location.port : ''));

  // if the user just landed on this page, get the recent messages
  $.get('/about/' + $('body').data('channel') + '/recent', function(data) {
    var messageList = data.messages;

    for (var i = 0; i < messageList.generic.length; i ++) {
      messages.updateMessage(messageList.generic[i]);
    }

    for (var i = 0; i < messageList.media.length; i ++) {
      messages.updateMedia(messageList.media[i]);
    }

    users.setUserList(data);
  });

  login.click(function(ev) {
    ev.preventDefault();
    navigator.id.request();
  });

  navigator.id.watch({
    loggedInEmail: currentUser,
    onlogin: function(assertion) {
      $.ajax({
        type: 'POST',
        url: '/login',
        data: { assertion: assertion },
        success: function(res, status, xhr) {
          messageForm.removeClass('disabled').addClass('enabled');
          messageForm.find('form').addClass('font' + res.font);
          login.remove();
          currentUser = res.email;
        },
        error: function(res, status, xhr) {
          alert('login failure ' + res);
        }
      });
    },
    onlogout: function() {
      $.ajax({
        type: 'GET',
        url: '/logout',
        success: function(res, status, xhr) {
          window.location.reload();
        },
        error: function(res, status, xhr) {
          console.log('logout failure ' + res);
        }
      });
    }
  });

  $(window, 'input').focus(function() {
    messages.clearUnreadMessages(currentChannel);
  });

  messageForm.find('form').submit(function(ev) {
    ev.preventDefault();
    messages.postMessage($(this));
  });

  $('ol').on('click', 'li a.delete', function(ev) {
    ev.preventDefault();
    $(this).closest('li').remove();
  });

  socket.on('connect', function () {
    socket.on('userlist', function (data) {
      users.setUserList(data);
    });

    socket.on('usercount', function (data) {
      users.setUserCount(data);
    });

    socket.on('message', function (data) {
      messages.updateMessage(data);
    });

    socket.emit('join channel', currentChannel);
  });

  // close info lists
  $('.info-block a.close').click(function() {
    $(this).parent().fadeOut();
  });

  $('form input').click(function() {
    $('.info-block').fadeOut();
  });

  // autofill the message with a help command
  $('#help li').click(function() {
    $('form input').val($(this).data('action')).focus();
    commands.hideAllCommands();
  });
});
